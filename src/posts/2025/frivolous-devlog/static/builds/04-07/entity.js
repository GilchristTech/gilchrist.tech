export class Entity {
  constructor (name) {
    this.name = name;

    this.state = null;
    this.game  = null;

    // Geometric properties
    this.__x = 0;
    this.__y = 0;

    this.flip_h = false;

    // Sprite properties

    this.spritesheet = null;
    this.__sprite_x  = null;
    this.__sprite_y  = null;

    // Map properties

    this.map      = null;
    this.row_i    = null;
    this.row_next = null;
    this.row_prev = null;

    this.spawned_next = null;
    this.spawned_prev = null;

    this.transform_will      = false;
    this.transform_insert    = false;
    this.transform_remove    = false;
    this.transform_spawn     = false;
    this.transform_spawn = false;
    this.transform_next      = null;

    this.init(...arguments);

    this.radius ||= 36;
    this.w ||= 72;
    this.h ||= 72;
  }

  get sprite_x () { return this.__sprite_x; }
  get sprite_y () { return this.__sprite_y; }

  set sprite_x (value) { return (this.__sprite_x = value); }
  set sprite_y (value) { return (this.__sprite_y = value); }

  get sprite_i () {
    if (!this.__sprite_x && !this.__sprite_y)
      return 0;

    const spritesheet = this.assertSpritesheet();

    return (this.__sprite_x % spritesheet.cells_w) + ((this.__sprite_y * spritesheet.cells_w) >> 0);
  }

  set sprite_i (value) {
    if (!value) {
      this.__sprite_x = value;
      this.__sprite_y = value;
      return;
    }

    const spritesheet = this.assertSpritesheet();
    this.__sprite_x = value % spritesheet.cells_w;
    this.__sprite_y = (value / spritesheet.cells_w) >> 0;
    return value;
  }

  get x () { return this.__x; }

  set x (value) {
    this.flip_h = (value > this.__x);
    this.assertPositionalValue(value);
    return (this.__x = value);
  }

  get y () {return this.__y; }
  set y (value) {
    this.assertPositionalValue(value);

    this.__y = value;
    if (this.map) {
      this.map.refreshEntityPosition(this);
    }
    return value;
  }

  assertPositionalValue (value) {
    if (value !== null && !Number.isFinite(value)) {
      throw "Positional value is not a finite number or null";
    }
  }

  init (name) {
    if (this.__init)
      this.__init(this, ...arguments);
  }

  assertSpritesheet () {
    let spritesheet = this.spritesheet;

    if (!spritesheet) {
      throw "Spritesheet not set";
    }

    if (typeof spritesheet === "string") {
      const load_spritesheet = spritesheets[spritesheet];
      if (typeof load_spritesheet === "object") {
        spritesheet = load_spritesheet;
      } else {
        throw "Spritesheet is not an object";
      }
    }

    if (!spritesheet)
      throw "Spritesheet not set";

    if (!spritesheet.loaded)
      throw "Spritesheet not loaded";

    return spritesheet;
  }

  onDraw (tick, time, ox=0, oy=0, scale=1) {
    if (!this.state || !this.state.ctx || !this.spritesheet)
      return;

    if (typeof this.spritesheet === "string") {
      this.spritesheet = spritesheets[this.spritesheet];
      if (typeof this.spritesheet === "string") {
        return;
      }
    }

    const ctx = this.state.ctx;
    const draw_x = (this.x - ox) * scale;
    const draw_y = (this.y - oy - this.h + 4) * scale;

    ctx.save();
    ctx.translate(draw_x, draw_y);

    if (this.flip_h) {
      ctx.scale(-1, 1);
    }

    this.spritesheet.drawCell(
      ctx,
      this.sprite_x,
      this.sprite_y,
      -this.w/2 * scale, 0,
      this.w * scale,
      this.h * scale,
      this.spritesheet.scaling * scale,
    );

    ctx.restore();
  }

  moveInDirection (theta, distance) {
    this.x += Math.cos(theta) * distance;
    this.y += Math.sin(theta) * distance;
  }

  moveTowards (x, y, step) {
    const rise = y - this.y;
    const run  = x - this.x;

    const distance = Math.sqrt(Math.min(
      rise * rise + run * run,
      step * step
    ));

    const theta = Math.atan2(rise, run);

    this.moveInDirection(theta, distance);
  }

  despawn () {
    if (this.map) {
      this.map.despawnEntity(this);
    }
  }
}

export class EntityMap {
  constructor () {
    this.state = null;
    this.game  = null;
    this.rows = [];

    this.length = 0;

    this.id_counter = 0;

    this.transform_head = null;
    this.spawned_head = null;

    this.row_offset = 4096;
  }

  getRowIndex (i) {
    if (!Number.isFinite(i)) {
      throw "Row index is not finite";
    }

    return (i << 0) + this.row_offset;
  }

  resizeOffset (size) {
    const add = size - this.row_offset;

    if (add <= 0) {
      return;
    }

    for (let entity = this.spawned_head; entity; entity = entity.spawned_prev) {
      if (entity.spawned_prev === entity)
        throw "Entity loops into itself";
      if (Number.isFinite(entity.row_i)) {
        entity.row_i += add;
      }
    }

    this.rows = Array(add).fill(null).concat(this.rows);
    this.row_offset = size;
  }

  spawnEntity (entity, x, y) {
    if (arguments.length != 3) {
      throw TypeError("spawnEntity expects three arguments");
    }

    this.assertNotEntity(entity);

    if (entity.transform_despawn) {
      throw "Entity already set to despawn";
    }

    entity.transform_spawn  = true;
    entity.transform_insert = true;
    entity.x = x;
    entity.y = y;

    if (entity.transform_remove) {
      throw "Entity already set to remove";
    }

    this.transformPushEntity(entity);
  }

  despawnEntity (entity) {
    this.assertEntity(entity);

    if (entity.transform_spawn) {
      throw "Entity already set to spawn";
    }

    entity.transform_despawn = true;
    entity.transform_insert  = false;
    entity.transform_remove  = true;

    this.transformPushEntity(entity);
  }

  refreshEntityPosition (entity) {
    const new_row_i = this.getRowIndex(entity.__y);
    if (new_row_i != entity.row_i) {
      entity.transform_remove = true;
      entity.transform_insert = true;
      if (!entity.transform_will) {
        this.transformPushEntity(entity);
      }
    }
  }

  transformPushEntity (entity) {
    if (!entity.transform_next) {
      entity.transform_will = true;
      entity.transform_next = this.transform_head;
      this.transform_head   = entity;
    }
  }

  transformPopEntity () {
    const entity = this.transform_head;
    if (!entity) {
      return (this.transform_head = null);
    }

    entity.transform_will = false;
    this.transform_head = entity.transform_next;
    entity.transform_next = null;
    return entity;
  }

  assertEntity (entity) {
    if (!entity) {
      throw "Entity is falsey";
    }

    if (!entity.map || entity.row_i == null || entity.map == null) {
      throw "Entity does not have all properties defined";
    }

    if ((!entity.spawned_prev && !entity.spawned_next) && (entity !== this.spawned_head)) {
      throw "Entity has both spawned_prev and spawned_next falsey, and it is not the spawned head.";
    }
  }

  insertEntity (entity) {
    if (!entity)
      throw "Entity is falsey";

    this.assertNotEntity(entity);

    const row_i    = this.getRowIndex(entity.y);
    const row_head = this.rows[row_i];

    entity.row_i = row_i;
    
    if (!row_head) {
      this.rows[row_i] = entity;
      entity.row_end   = entity;
      entity.row_next  = null;
      entity.row_prev  = null;
      this.assertEntity(entity);
      return;
    }

    // row_head is truthy

    const old_row_end    = row_head.row_end;
    old_row_end.row_next = entity;
    entity.row_prev      = old_row_end;
    row_head.row_end     = entity;
    this.assertEntity(entity);
    this.assertEntity(row_head);
  }

  assertNotEntity (entity) {
    try {
      this.assertEntity(entity);
      throw "Did not error";
    } catch {
      return;
    }
  }

  removeEntity (entity) {
    this.assertEntity(entity);

    const row_i = entity.row_i;
    const row_head = this.rows[row_i];

    if (!row_head) {
      throw "Row head is falsey";
    }

    // If the entity is the row_head, shift the row_head
    if (row_head === entity) {
      const new_row_head = row_head.row_next || null;

      if (new_row_head) {
        new_row_head.row_prev = null;
        new_row_head.row_end = row_head.row_end;
        this.assertEntity(new_row_head);
      }

      this.rows[row_i] = new_row_head;

      entity.row_end  = null;
      entity.row_next = null;
      entity.row_prev = null;
      return;
    }

    // The row head is not the entity being removed. Remove entity from the middle of the list.

    if (row_head.row_end === entity) {
      row_head.row_end = entity.row_prev;
      this.assertEntity(row_head.row_end);
    }

    const old_prev = entity.row_prev;
    const old_next = entity.row_next;

    if (old_prev) {
      old_prev.row_next = old_next;
      this.assertEntity(old_prev);
    }

    if (old_next) {
      old_next.row_prev = old_prev;
      this.assertEntity(old_next);
    }

    entity.row_end  = null;
    entity.row_next = null;
    entity.row_prev = null;

    this.assertEntity(row_head);
  }

  update () {
    let removes = 0;
    let inserts = 0;

    for (let en = this.transform_head; en; en = this.transformPopEntity()) {
      if (en.transform_spawn) {
        if (en.transform_despawn) {
          throw "Entity transformation is set to both spawn and despawn entity";
        }

        this.assertNotEntity(en);

        en.map   = this;
        en.game  = this.game;
        en.state = this.state;
        en.id    = this.id_counter++;

        en.spawned_prev = this.spawned_head;
        if (this.spawned_head) {
          this.spawned_head.spawned_next = en;
        }
        en.spawned_next = null;
        this.spawned_head = en;

        this.length++;

      } else if (en.transform_remove) {
        this.assertEntity(en);
        this.removeEntity(en);
        removes++;
        this.assertNotEntity(en);
      }

      if (en.transform_despawn) {
        const prev = en.spawned_prev;
        const next = en.spawned_next;

        if (prev) prev.spawned_next = next;
        if (next) next.spawned_prev = prev;

        if (this.spawned_head === en) {
          this.spawned_head = prev;
        }

        this.length--;

        en.spawned_next = null;
        en.spawned_prev = null;
        en.map          = null;
        en.game         = null;

        this.assertNotEntity(en);

      } else if (en.transform_insert) {
        if (en.y <= -this.row_offset) {
          let new_size = this.row_offset * 2;
          while (en.y >= -this.row_offset)
            new_size *= 2;

          this.resizeOffset(new_size);
        }

        this.assertNotEntity(en);
        this.insertEntity(en);
        inserts++;
        this.assertEntity(en);
      }

      en.transform_insert  = false;
      en.transform_remove  = false;
      en.transform_spawn   = false;
      en.transform_despawn = false;
      en.transform_will    = false;
    }
  }

  applySpawnedEntities (func) {
    for (let entity = this.spawned_head; entity; entity = entity.spawned_prev) {
      func(entity);
    }
  }

  applyRowEntities (func) {
    for (let row_head of this.rows) {
      if (!row_head)
        continue;

      for (let entity = row_head; entity; entity = entity.row_next) {
        func(entity);
      }
    }
  }

  getEntitiesWithin (x, y, distance, skip_entity=null) {
    const entities_within = [];

    for (let entity = this.spawned_head; entity; entity = entity.spawned_prev) {
      const max_a2b2 = (distance + entity.radius) * (distance + entity.radius);
      const rise = entity.y - y;
      const run  = entity.x - x;
      const a2b2 = rise * rise + run * run;

      if (entity !== skip_entity && a2b2 < max_a2b2) {
        entities_within.push([entity, a2b2]);
      }
    }

    return entities_within;
  }

  *iterEntitiesWithin (x, y, distance) {
    for (let entity = this.spawned_head; entity; entity = entity.spawned_prev) {
      const max_a2b2 = (distance + entity.radius) * (distance + entity.radius);
      const rise = entity.y - y;
      const run  = entity.x - x;
      const a2b2 = rise * rise + run * run;

      if (a2b2 < max_a2b2) {
        yield [entity, a2b2];
      }
    }
  }
}

export default Entity;
