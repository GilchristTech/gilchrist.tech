import Entity from "./entity.js";
import Enemy  from "./enemy.js";

export class Projectile extends Entity {
  init () {
    this.radius = 4;

    this.start_tick = null;
    this.max_ticks  = 60 * 10;
    this.ticks = 0;

    this.dx = 0;
    this.dy = 0;

    // Track how many enemies this bullet can hit before despawning
    this.hits = 0;
    this.max_hits = 1;

    this.speed = 6;
  }

  onTick (tick) {
    if (this.ticks++ > this.max_ticks) {
      this.despawn();
      return;
    }

    this.x += this.dx;
    this.y += this.dy;

    if (!this.map) {
      return;
    }

    // Collide with the first enemy we can

    for (let [entity, a2b2] of this.map.iterEntitiesWithin(this.x, this.y, this.radius)) {
      if (entity instanceof Enemy) {
        this.hits++;

        if (this.max_hits > 0 && this.hits >= this.max_hits) {
          this.despawn();
        }

        entity.despawn();
        return;
      }
    }
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
