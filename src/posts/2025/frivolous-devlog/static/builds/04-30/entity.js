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
    this.sprite_offset_x = 0;
    this.sprite_offset_y = 0;

    // Map properties

    this.map      = null;
    this.row_i    = null;
    this.row_next = null;
    this.row_prev = null;

    this.tile_map = null;

    this.noclip = false;

    this.spawned_next = null;
    this.spawned_prev = null;

    this.transform_will      = false;
    this.transform_insert    = false;
    this.transform_remove    = false;
    this.transform_spawn     = false;
    this.transform_next      = null;

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

  onTick (tick) {}

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
    let draw_x = (this.x - ox) * scale;
    let draw_y = (this.y - oy - this.h + this.radius/2 + this.sprite_offset_y) * scale;

    if (this.flip_h) {
      draw_x -= this.sprite_offset_x;
    } else {
      draw_x += this.sprite_offset_x;
    }


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
    const vx = Math.cos(theta) * distance;
    const vy = Math.sin(theta) * distance;
    this.moveBy(vx, vy);
  }

  moveBy (vx, vy, slide=true) {
    const tile_map  = this.tile_map;

    // If there's no tile map defined or if this has noclip, no
    // collision needs to be calculated. Just set the position
    // and exit.
    //
    if (!tile_map || this.noclip) {
      this.x += vx;
      this.y += vy;
      return null;
    }

    if (slide) {
      const horizontal_collide = tile_map.circleCollidesSolid(this.x + vx, this.y, this.radius);
      const vertical_collide   = tile_map.circleCollidesSolid(this.x, this.y + vy, this.radius);

      if (vx && ! horizontal_collide)
        this.x += vx;

      if (vy && ! vertical_collide)
        this.y += vy;

      return horizontal_collide || vertical_collide;

    } else {
      const collision = tile_map.circleCollidesSolid(this.x + vx, this.y + vy, this.radius);

      if (!collision) {
        this.x += vx;
        this.y += vy;
      }

      return collision;
    }
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


export default Entity;
