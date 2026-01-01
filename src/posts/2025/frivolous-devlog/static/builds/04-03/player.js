/*
  The player object and events
*/

import { Entity, EntityMap } from "./entity.js";
import Enemy from "./enemy.js";
import { Spritesheet, spritesheets } from "./assets.js";


export class Player extends Entity {
  init (name="player") {
    this.character = player_characters[2].copy();

    this.name ||= name;
    this.x = 0;
    this.y = 0;
    this.w = 76;
    this.h = 76;

    this.range = 800;
    this.speed =   4;

    this.spritesheet = this.character.spritesheet;
    this.sprite_i = this.character.sprite_i;
  }

  onTick (tick) {
    // Handle movement
    //
    let vx = 0;
    let vy = 0;

    if (this.game.keys.KeyA) vx -= 1;
    if (this.game.keys.KeyD) vx += 1;
    if (this.game.keys.KeyW) vy -= 1;
    if (this.game.keys.KeyS) vy += 1;

    const theta = Math.atan2(vy, vx);
    if (vx != 0) this.x += Math.cos(theta) * this.speed;
    if (vy != 0) this.y += Math.sin(theta) * this.speed;

    // Fire weapons
    //
    if (tick % 12 == 0) {
      const bullet = new PlayerBullet();

      const entity_entries_iter = this.map.iterEntitiesWithin(
          this.x, this.y, this.range
        );

      let closest_enemy = null;
      let min_a2b2      = null;

      for (let [entity, a2b2] of entity_entries_iter) {
        if (!(entity instanceof Enemy)) {
          continue;
        }

        // Check if the enemy is within firing range

        if (min_a2b2 === null || a2b2 < min_a2b2) {
          closest_enemy = entity;
          min_a2b2 = a2b2;
        }

        // Check if the enemy is in range to melee player

        let max_melee_a2b2 = this.radius + entity.radius;
        max_melee_a2b2 *= max_melee_a2b2;

        if (a2b2 < max_melee_a2b2) {
          this.character.hp -= 1;
        }
      }

      if (closest_enemy) {
        let theta = Math.atan2(closest_enemy.y - this.y, closest_enemy.x - this.x);

        // Apply a random spread to the bullet angle

        const spread = Math.PI * 0.2;
        theta += Math.random() * spread - spread/2;

        const d_cos = Math.cos(theta);
        const d_sin = Math.sin(theta);

        bullet.dx = d_cos * bullet.speed;
        bullet.dy = d_sin * bullet.speed;

        bullet.start_tick = tick;

        this.map.spawnEntity(
          bullet,
          this.x + d_cos * this.radius,
          this.y + d_sin * this.radius
        );
      }
    }
  }
}


export class PlayerBullet extends Entity {
  init () {
    this.radius = 4;

    this.start_tick = null;
    this.max_ticks  = 60 * 10;

    this.dx = 0;
    this.dy = 0;

    this.speed = 6;
  }

  onTick (tick) {
    const target = this.target;

    if (tick >= this.start_tick + this.max_ticks) {
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
        this.despawn();
        entity.despawn();
        return;
      }
    }
  }

  onDraw (ox=0, oy=0, scale=1) {
    if (!this.game || !this.game.ctx)
      return;

    const ctx = this.game.ctx;
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


class Character {
  constructor (obj={}) {
    this.name = obj.name || "character";

    this.__spritesheet = obj.spritesheet || "rogues";
    this.sprite_i = obj.sprite_i || 0;

    this.range     = obj.range     || 100;
    this.speed     = obj.speed     ||   1;
    this.fire_rate = obj.fire_rate ||   1;
    this.max_hp    = obj.max_hp    ||  10;
    this.hp        = this.max_hp;
  }

  get spritesheet () {
    if (!(this.__spritesheet instanceof Spritesheet)) {
      this.__spritesheet = spritesheets[this.__spritesheet];
    }
    return this.__spritesheet;
  }

  copy () {
    return Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this
    );
  }
}

export const player_characters = [
  new Character ({ sprite_i:  0 }),
  new Character ({ sprite_i:  1 }),
  new Character ({ sprite_i:  2 }),
  new Character ({ sprite_i:  3 }),
  new Character ({ sprite_i:  4 }),

  // empty

  new Character ({ sprite_i:  6 }),
  new Character ({ sprite_i:  7 }),
  new Character ({ sprite_i:  8 }),
  new Character ({ sprite_i:  9 }),
  new Character ({ sprite_i: 10 }),

  // empty

  new Character ({ sprite_i: 12 }),
  new Character ({ sprite_i: 13 }),
  new Character ({ sprite_i: 14 }),
  new Character ({ sprite_i: 15 }),
  new Character ({ sprite_i: 16 }),

  // empty

  new Character ({ sprite_i: 18 }),
  new Character ({ sprite_i: 19 }),
  new Character ({ sprite_i: 20 }),
  new Character ({ sprite_i: 21 }),
  new Character ({ sprite_i: 22 }),
  new Character ({ sprite_i: 23 }),
  new Character ({ sprite_i: 24 }),
  new Character ({ sprite_i: 25 }),
  new Character ({ sprite_i: 26 }),
  new Character ({ sprite_i: 27 }),
  new Character ({ sprite_i: 28 }),
  new Character ({ sprite_i: 29 }),
  new Character ({ sprite_i: 30 }),
  new Character ({ sprite_i: 31 }),
  new Character ({ sprite_i: 32 }),
  new Character ({ sprite_i: 33 }),
  new Character ({ sprite_i: 34 }),
  new Character ({ sprite_i: 35 }),
  new Character ({ sprite_i: 36 }),
  new Character ({ sprite_i: 37 }),
  new Character ({ sprite_i: 38 }),
  new Character ({ sprite_i: 39 }),
  new Character ({ sprite_i: 40 }),

  // empty
];

export default Player;
