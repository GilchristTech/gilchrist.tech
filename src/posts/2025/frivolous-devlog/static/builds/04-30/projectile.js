import Entity from "./entity.js";
import Enemy  from "./enemy.js";


export class Projectile extends Entity {
  constructor (obj={}) {
    super(obj.name || "projectile");
    this.radius = obj.radius || 4;

    this.start_radius = this.radius;
    this.end_radius   = obj.end_radius || null;

    this.source_entity    = obj.source_entity    || null;
    this.source_character = obj.source_character || null;

    this.start_tick = obj.start_tick || null;
    this.max_ticks  = obj.max_ticks  || 60 * 10; // ten seconds
    this.ticks = 0;

    this.vx = obj.vx || 0;
    this.vy = obj.vy || 0;

    this.damage = obj.damage || 1;

    // Track how many enemies this bullet can hit before despawning
    this.hits = 0;
    this.max_hits = obj.max_hits || 1;

    this.speed = obj.speed || 6;
  }

  onTick (tick) {
    if (this.ticks++ > this.max_ticks) {
      this.despawn();
      return;
    }

    if (this.end_radius) {
      const tick_ratio   = this.ticks / this.max_ticks;
      const radius_range = this.end_radius - this.start_radius;
      this.radius        = this.start_radius + tick_ratio * radius_range;
    }

    this.moveBy(this.vx, this.vy, false /* don't let bullets slide along walls */);

    if (!this.map) {
      return;
    }

    // Collide with the first enemy we can

    for (let [entity, a2b2] of this.map.iterEntitiesWithin(this.x, this.y, this.radius)) {
      if (entity instanceof Enemy) {
        this.hitEntity(tick, entity);
        if (this.max_hits > 0 && this.hits >= this.max_hits) {
          break;
        }
      }
    }
  }

  hitEntity (tick, entity) {
    this.hits++;

    if (entity.onHit)
      entity.onHit(tick, this, this.damage);

    if (this.max_hits > 0 && this.hits >= this.max_hits) {
      this.despawn();
    }
  }

  onKillOther (other) {
    this.source_entity?.onKillOther(other);
  }

  onDraw (tick, time, ox=0, oy=0, scale=1) {
    if (!this.state)
      return;

    const ctx = this.state.ctx;
    ctx.save();
    ctx.fillStyle = "#ff0";
    ctx.beginPath();
    ctx.arc(
      scale * (this.x - ox),
      scale * (this.y - 38 - oy),
      scale * this.radius  /* radius */,
      0, 2 * Math.PI       /* circle */
    );
    ctx.fill();
    ctx.restore();
  }
}


export default Projectile;
