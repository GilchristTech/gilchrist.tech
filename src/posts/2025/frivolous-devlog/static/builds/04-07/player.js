/*
  The player object and events
*/

import Entity      from "./entity.js";
import Enemy       from "./enemy.js";
import Character   from "./character.js";
import Projectile  from "./projectile.js";


export class Player extends Entity {
  init (name="player", character = null) {
    character ||= player_characters[0].copy();
    this.character = character;

    this.name ||= name;
    this.x = 0;
    this.y = 0;
    this.w = 76;
    this.h = 76;

    this.attack_tick = 0;
    this.damage_tick = 0;

    this.spritesheet = this.character.spritesheet;
    this.sprite_i    = this.character.sprite_i;
  }

  set radius (value) { return this.character.hitbox = value; }
  get radius ()      { return this.character.hitbox; }

  onTick (tick) {
    const game = this.game;
    // Handle movement
    //
    let vx = 0;
    let vy = 0;

    this.last_x = this.x;
    this.last_y = this.y;

    if (this.game.pointer_on) {
      const pointer_theta = Math.atan2(game.pointer_dy, game.pointer_dx);
      vx += Math.cos(pointer_theta);
      vy += Math.sin(pointer_theta);
    }

    if (game.keys.KeyA) vx -= 1;
    if (game.keys.KeyD) vx += 1;
    if (game.keys.KeyW) vy -= 1;
    if (game.keys.KeyS) vy += 1;

    GAMEPAD:
    if (this.game.gamepad_index !== null) {
      const gamepads = navigator.getGamepads();
      const gamepad  = gamepads[this.game.gamepad_index || 0];

      if (!gamepad)
        break GAMEPAD;

      const gamepad_x = gamepad.axes[0];
      const gamepad_y = gamepad.axes[1];

      // Left stick
      if (Math.abs(gamepad_x) > 0.1) vx += gamepad_x;
      if (Math.abs(gamepad_y) > 0.1) vy += gamepad_y;

      // D-Pad
      if (gamepad.buttons[14].pressed) vx -= 1; // left
      if (gamepad.buttons[15].pressed) vx += 1; // right
      if (gamepad.buttons[12].pressed) vy -= 1; // up
      if (gamepad.buttons[13].pressed) vy += 1; // down
    }

    const theta = Math.atan2(vy, vx);
    if (vx != 0) this.x += Math.cos(theta) * this.character.speed;
    if (vy != 0) this.y += Math.sin(theta) * this.character.speed;

    // Handle entities in range around the player
    //
    const entity_entries_iter = this.map.iterEntitiesWithin(
        this.x, this.y, this.character.range,
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

      let max_melee_a2b2 = this.character.hitbox + entity.radius;
      max_melee_a2b2 *= max_melee_a2b2;

      if (a2b2 < max_melee_a2b2) {
        if (tick >= this.damage_tick + this.character.damage_cooldown) {
          this.damage_tick = tick;
          this.character.hp -= 1;
        }
      }
    }

    // Fire weapons
    //
    if (
      closest_enemy &&
      tick >= this.attack_tick + this.character.attack_cooldown
    ){
      const bullet = new Projectile();

      bullet.source_entity = this;
      bullet.max_hits  = this.character.pierce;
      bullet.radius    = this.character.attack_radius;
      bullet.speed     = this.character.projectile_speed;
      bullet.max_ticks = this.character.range / bullet.speed;

      this.attack_tick = tick;
      let theta = Math.atan2(closest_enemy.y - this.y, closest_enemy.x - this.x);

      // Apply a random spread to the bullet angle

      const spread = this.character.attack_spread;
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

  onDraw (tick, time, ox=0, oy=0, scale=1) {
    if (
      this.character.does_steps && (
        (this.x != this.last_x) ||
        (this.y != this.last_y)
      )
    ){
      oy += Math.sin(tick/3) * 2 * scale;
    }

    super.onDraw(
        tick, time,
        ox, oy,
        scale
      );
  }
}


export const player_characters = [
  new Character ({
    name:       "Knight",
    max_hp:           20,
    sprite_i:          8,
    range:            78,
    pierce:           -1,
    attack_radius:    18,
    attack_cooldown:  18,
    damage_cooldown: 180,
    attack_spread:    Math.PI/4,
    projectile_speed: 16,
    hitbox:           20,
    speed:             2.5,
  }),

  new Character ({
    name:        "Rogue",
    max_hp:            8,
    sprite_i:          3,
    range:            80,
    pierce:            1,
    attack_radius:     2,
    attack_cooldown:  12,
    damage_cooldown:  90,
    hitbox:           18,
    speed:             6,
  }),

  new Character ({
    name:      "Archer",
    sprite_i:         2,
    range:          400,
    projectile_speed: 10,
    pierce:           1,
    attack_cooldown: 15,
    damage_cooldown: 18,
    speed:            5,
    attack_spread:   Math.PI/6,
    hitbox:          38,
  }),

  new Character ({
    name:          "Mage",
    sprite_i:          14,
    range:            250,
    pierce:            -1,
    attack_radius:     30,
    attack_cooldown:   40,
    attack_spread:    Math.PI/8,
    damage_cooldown:   15,
    hitbox:             8,
    speed:              3,
    projectile_speed:   8,
  }),

  new Character({
    name:       "Priest",
    max_hp:           15,
    sprite_i:         12,
    range:            64,
    attack_radius:     6,
    pierce:           -1,
    attack_cooldown:  12,
    attack_spread:   Math.PI,
    damage_cooldown:  60,
    hitbox:           12,
    projectile_speed:  8,
  }),

  new Character({
    name:      "Peasant",
    max_hp:           12,
    sprite_i:         32,
    range:           125,
    attack_radius:     2,
    pierce:            4,
    attack_cooldown:  30,
    hitbox:           24,
    speed:             5,
    projectile_speed: 10,
  }),

  /*
  new Character ({ sprite_i:  0 }), new Character ({ sprite_i:  1 }),
  new Character ({ sprite_i:  4 }),

  // empty

  new Character ({ sprite_i:  6 }), new Character ({ sprite_i:  7 }),
  new Character ({ sprite_i:  9 }), new Character ({ sprite_i: 10 }),

  // empty

  new Character ({ sprite_i: 13 }), new Character ({ sprite_i: 15 }),
  new Character ({ sprite_i: 16 }),

  // empty

  new Character ({ sprite_i: 18 }), new Character ({ sprite_i: 19 }),
  new Character ({ sprite_i: 20 }), new Character ({ sprite_i: 21 }),
  new Character ({ sprite_i: 22 }), new Character ({ sprite_i: 23 }),
  new Character ({ sprite_i: 24 }), new Character ({ sprite_i: 25 }),
  new Character ({ sprite_i: 26 }), new Character ({ sprite_i: 27 }),
  new Character ({ sprite_i: 28 }), new Character ({ sprite_i: 29 }),
  new Character ({ sprite_i: 30 }), new Character ({ sprite_i: 31 }),
  new Character ({ sprite_i: 33 }), new Character ({ sprite_i: 34 }),
  new Character ({ sprite_i: 35 }), new Character ({ sprite_i: 36 }),
  new Character ({ sprite_i: 37 }), new Character ({ sprite_i: 38 }),
  new Character ({ sprite_i: 39 }), new Character ({ sprite_i: 40 }),

  // empty
  */
];


export default Player;
