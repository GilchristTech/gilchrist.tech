import Entity from "./entity.js";
import { drawFillRect, circleIntersectsRect} from "./utils.js";

export class EntityMap {
  constructor () {
    this.state    = null;
    this.game     = null;
    this.tile_map = null;

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

        en.map      = this;
        en.tile_map = this.tile_map;
        en.game     = this.game;
        en.state    = this.state;
        en.id       = this.id_counter++;

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

  applyRowEntities (func, top=null, bottom=null) {
    if (top === null) {
      top = -this.row_offset;
    } else {
      top += this.row_offset;
    }

    bottom ??= this.rows.length;
    bottom += this.row_offset;

    for (let row_i = top; row_i < bottom; row_i++) {
      const row_head = this.rows[row_i];
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


export class TileMap {
  constructor (obj={}) {
    this.tile_size = obj.tile_size || 152;

    this.default_tile = obj.default_tile || 0x101;

    if (obj.rows) {
      this.rows = obj.rows;

      this.tiles_w = 0;
      this.tiles_h = this.rows.length; 

      for (let row of this.rows)
        this.tiles_w = Math.max(this.tiles_w, row.length);

    } else {
      this.tiles_w = obj.tiles_w || 30;
      this.tiles_h = obj.tiles_h || 30;

      this.rows = [];

      const border_thickness = 5;
      const w = this.tiles_w;
      const h = this.tiles_h;

      this.setTiles(null, 0, 0, w, h);
      this.generateBorder(0x101, 0, 0, w, h, border_thickness);
      this.generateDivisionMaze(0x101, border_thickness, border_thickness, w-border_thickness*2, h-border_thickness*2);
    }

    // Bits within this mask refer to the tile's renderer index.
    // This allows for bits beyond the mask to store other tile
    // metadata.
    //
    this.tile_mask = 0xff;

    this.tile_renderer_index = [
      // 0 - nothing
      null,

      // 1 - wall
      (ctx, sx, sy, dx, dy, scale) => {
        const down_row = this.rows[sy+1];
        const down_tile = down_row && down_row[sx];
        const size      = this.tile_size * scale;

        if (down_tile) {
          drawFillRect(ctx, dx, dy, size+1, size+1, "#041420");
        } else {
          drawFillRect(ctx, dx, dy, size+1, size+1, "#234");

          const gutter_size = 8;
          const brick_w = this.tile_size - gutter_size;
          const brick_h = (this.tile_size / 2) - gutter_size;

          drawFillRect(
              ctx,
              dx - 1,
              dy + gutter_size/2 * scale,
              brick_w * scale/2 + 1, brick_h * scale,
              "#368"
            );

          drawFillRect(
              ctx,
              dx + (brick_w/2 + gutter_size) * scale,
              dy + gutter_size/2 * scale,
              brick_w * scale/2 + 1, brick_h * scale,
              "#368"
            );

          drawFillRect(
              ctx,
              dx + gutter_size/2 - 1,
              dy + (this.tile_size/2 + gutter_size/2) * scale,
              brick_w * scale, brick_h * scale,
              "#368"
            );
        }
      },
    ];
  }

  getTileXY (x, y) {
    return [
      x / this.tile_size >> 0,
      y / this.tile_size >> 0
    ];
  }

  getTile (x, y) {
    const tx = x / this.tile_size >> 0;
    const ty = y / this.tile_size >> 0;

    const row = this.rows[ty];
    if (!row)
      return null;

    return row[tx] ?? null;
  }

  getTileSolid (x, y) {
    const tile_code = this.getTile(x, y);
    if (tile_code == null)
      return false;
    return (tile_code & 0x100) == 0x100;
  }

  circleCollidesSolid (x, y, radius) {
    const tile_size = this.tile_size;
    const top    = tile_size * ((y - radius) / tile_size >> 0);
    const bottom = tile_size * ((y + radius) / tile_size >> 0);
    const left   = tile_size * ((x - radius) / tile_size >> 0);
    const right  = tile_size * ((x + radius) / tile_size >> 0);

    for (let tile_y = top;  tile_y <= bottom; tile_y += tile_size)
    for (let tile_x = left; tile_x <= right;  tile_x += tile_size) {
      if (
        this.getTileSolid(tile_x, tile_y) &&
        circleIntersectsRect(x, y, radius, tile_x, tile_y, tile_size, tile_size)
      )
        return true;
    }

    return false
  }

  setTiles(wall, tx, ty, tw=1, th=1) {
    if (tx < 0 || ty < 0 || tw < 0 || th < 0) {
      throw "Cannot set tiles with negative values";
    }

    if (tw == 0 || tw == 0) {
      return;
    }

    if (tx + tw > this.tiles_w) {
      this.tiles_w = tx + tw;
    }

    for (let y=ty; y < ty+th; y++) {
      while (y >= this.rows.length) {
        this.rows.push(Array(this.tiles_w).fill(null));
      }

      for (let x=tx; x < tx+tw; x++) {
        this.rows[y][x] = wall;
      }
    }
  }


  generateBorder (tile, tx, ty, tw, th, thickness=1) {
    if (thickness < 1 || tw == 0 || th == 0) {
      return;
    }

    this.setTiles(tile, tx, ty, thickness, th);
    this.setTiles(tile, tx+tw-thickness-1, ty, thickness, th);
    this.setTiles(tile, tx+thickness, ty, tx+tw-thickness*2, thickness);
    this.setTiles(tile, thickness, ty+th-thickness, tw-thickness*2, thickness);
  }


  /*
    Given a rectangular region within the map, create a wall with
    an opening. Returns an objects with rects for each region:
    room_a, room_b, hall, wall_a, wall_b.
  */
  generateDivision (wall, tx, ty, tw, th, generation={}) {
    const wall_thickness = generation.wall_thickness ?? 2;
    const hall_thickness = generation.hall_thickness ?? 3;
    const vertical       = generation.vertical || false;

    const variable_size = (vertical) ? th : tw;
    const fixed_size    = (vertical) ? tw : th;

    const room_min_size   = generation.room_min_size   ?? 4;
    const wall_min_length = generation.wall_min_length ?? 0;
    
    // One-diminsional positions along the axes of the division
    // direction and along the division.

    const wall_position = variable_size/2 + (Math.random()-0.5) * (
      variable_size - 2*wall_thickness - 2*room_min_size
    ) >> 0;

    let hall_position = fixed_size/2 + (Math.random()-0.5) * (
      fixed_size - 2*hall_thickness - 2*wall_min_length
    ) >> 0;

    if (hall_position + hall_thickness > fixed_size) {
      hall_position = fixed_size - hall_thickness
    }

    // The region division is formed by two walls, wall A and
    // wall B. Calculate their lengths.
    const wall_length_a = hall_position;
    const wall_length_b = fixed_size - hall_position - hall_thickness;

    // Calculate all regions

    let hall = {};
    let room_a={}, room_b={};
    let wall_a={}, wall_b={};
    let quad_a={}, quad_b={}, quad_c={}, quad_d={};

    const regions = {room_a, room_b, hall, wall_a, wall_b};

    if (vertical) {
      room_a.x = tx;
      room_a.y = ty;
      room_a.h = wall_position;
      room_a.w = fixed_size;

      const division_top = ty + wall_position;

      wall_a.x = tx;
      wall_a.y = division_top;
      wall_a.w = hall_position;
      wall_a.h = wall_thickness;

      hall.x   = tx + hall_position;
      hall.y   = division_top;
      hall.w   = hall_thickness;
      hall.h   = wall_thickness;

      wall_b.x = hall.x + hall.w;
      wall_b.y = division_top;
      wall_b.w = fixed_size - wall_a.w - hall.w;
      wall_b.h = wall_thickness;

      room_b.x = tx;
      room_b.y = division_top + wall_thickness;
      room_b.w = fixed_size;
      room_b.h = variable_size - room_a.h - wall_thickness;

    } else /* horizontal */ {
      room_a.x = tx;
      room_a.y = ty;
      room_a.h = fixed_size;
      room_a.w = wall_position;

      const division_left = tx + wall_position;

      wall_a.x = division_left;
      wall_a.y = ty;
      wall_a.w = wall_thickness;
      wall_a.h = hall_position;

      hall.x   = division_left;
      hall.y   = ty + hall_position;
      hall.w   = wall_thickness;
      hall.h   = hall_thickness;

      wall_b.x = division_left;
      wall_b.y = hall.y + hall.w;
      wall_b.w = wall_thickness;
      wall_b.h = fixed_size - wall_a.h - hall.h;

      room_b.x = division_left + wall_thickness;
      room_b.y = ty;
      room_b.w = variable_size - room_a.w - wall_thickness;
      room_b.h = fixed_size;
    }

    // Generate quadrant regions

    const quadrants = [];
    regions.quadrants = quadrants;

    const quads_top_y  = ty;
    const quads_top_h  = hall.y - quads_top_y;
    const quads_bottom_y = hall.y + hall.h;
    const quads_bottom_h = ty + th - quads_bottom_y;

    const quads_left_x = tx;
    const quads_left_w = hall.x - quads_left_x;
    const quads_right_x = hall.x + hall.w;
    const quads_right_w = tx + tw - quads_right_x;

    quadrants.push({x: quads_left_x,  y: quads_top_y,    w: quads_left_w,  h: quads_top_h});
    quadrants.push({x: quads_right_x, y: quads_top_y,    w: quads_right_w, h: quads_top_h});
    quadrants.push({x: quads_left_x,  y: quads_bottom_y, w: quads_left_w,  h: quads_bottom_h});
    quadrants.push({x: quads_right_x, y: quads_bottom_y, w: quads_right_w, h: quads_bottom_h});

    this.setTiles(wall, wall_a.x, wall_a.y, wall_a.w, wall_a.h);
    this.setTiles(wall, wall_b.x, wall_b.y, wall_b.w, wall_b.h);

    return regions;
  }

  generateDivisionMaze (wall, tx, ty, tw, th, generation={}) {
    generation = { ...generation };
    const level = generation.level ?? 4;

    generation.wall_thickness  ??= 2;
    generation.hall_thickness  ??= 3;
    generation.vertical        ??= false;
    generation.room_min_size   ??= 4;
    generation.wall_min_length ??= 0;

    const variable_size = (generation.vertical) ? th : tw;
    const fixed_size    = (generation.vertical) ? tw : th;

    if (generation.wall_thickness + 2*generation.room_min_size > variable_size) {
      return;
    }

    if (generation.hall_thickness + 2*generation.wall_min_length > fixed_size) {
      return;
    }

    const regions = this.generateDivision(wall, tx, ty, tw, th, generation);

    if (level > 0) {
      for (let quadrant of regions.quadrants) {
        this.generateDivisionMaze(wall, quadrant.x, quadrant.y, quadrant.w, quadrant.h, {
          ...generation,
          vertical: Math.random() < 0.5,
          level:    level-1,
        });
      }
    }
  }
}


export default EntityMap;
