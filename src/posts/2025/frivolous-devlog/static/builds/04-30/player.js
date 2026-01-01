/*
  The player object and events
*/

import Entity      from "./entity.js";
import Enemy       from "./enemy.js";
import Coin        from "./coin.js";
import Projectile  from "./projectile.js";
import { Character, CharacterEntity } from "./character.js";


export class Player extends CharacterEntity {
  constructor (character) {
    super(character);
    this.attack_tick = 0;
  }

  onTick (tick) {
    super.onTick(tick);

    // Handle entities in range around the player
    //
    const entity_entries_iter = this.map.iterEntitiesWithin(
        this.x, this.y, this.character.range,
      );

    let closest_enemy = null;
    let min_a2b2      = null;

    const player_a2b2  = this.radius * this.radius;
    const pickup_range = this.radius * 2;
    const coin_radius  = 3;

    const coin_pickup_max_a2b2 = Math.pow(
        this.radius + coin_radius + pickup_range, 2
      );

    let check_damage = (tick >= this.damage_tick + this.character.damage_cooldown);

    for (let [entity, a2b2] of entity_entries_iter) {
      if (entity instanceof Coin) {
        const coin = entity;
        if (a2b2 < coin_pickup_max_a2b2) {
          this.character.coins += coin.quantity;;
          coin.despawn();
        }
        continue;
      }

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

      if (check_damage && a2b2 < max_melee_a2b2) {
        if (entity.hitEntity) {
          const hit_value = entity.hitEntity(null, this);

          if (hit_value !== null) {
            this.damage_tick = tick;
          }
        }
      }
    }

    // Fire weapons
    //
    if (
      closest_enemy &&
      tick >= this.attack_tick + this.character.attack_cooldown
    ){
      const character = this.character;

      this.attack_tick = tick;
      let theta = Math.atan2(closest_enemy.y - this.y, closest_enemy.x - this.x);

      // Apply a random spread to the bullet angle

      const spread = this.character.attack_spread;
      theta += Math.random() * spread - spread/2;

      const d_cos = Math.cos(theta);
      const d_sin = Math.sin(theta);

      const bullet = new Projectile({
        source_entity:    this,
        source_character: character,

        damage:     character.attack_damage,
        max_hits:   character.pierce,
        radius:     character.attack_radius,
        end_radius: character.attack_end_radius,

        // Projectile movement and lifetime
        speed:      character.projectile_speed,
        max_ticks:  character.range / character.projectile_speed,
        start_tick: tick,
        vx:         d_cos * character.projectile_speed,
        vy:         d_sin * character.projectile_speed,
      });

      this.map.spawnEntity(
        bullet,
        this.x + d_cos * (this.radius + bullet.radius),
        this.y + d_sin * (this.radius + bullet.radius),
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

  onHit (tick, source, damage) {
    const hit_value = super.onHit(tick, source, damage);
    
    if (this.character.hp <= 0) {
      this.onDeath(tick, source, damage);
      source?.onKillOther(this);
    }

    return hit_value;
  }

  onDeath () {
    this.despawn();
  }

  getRetreatVector () {
    const map = this.map;

    // Retreat directional vectors
    let retreat_dx = 0;
    let retreat_dy = 0;

    let total_urgency = 0;
    let num_enemies = 0;

    const range = this.character.retreat_range ?? this.character.range;
    const range_a2b2 = range * range;

    for (let [enemy, enemy_a2b2] of map.iterEntitiesWithin(this.x, this.y, range)) {
      if (!(enemy instanceof Enemy)) {
        continue;
      }

      num_enemies++;

      let urgency = enemy_a2b2 / range_a2b2;
      urgency *= urgency;

      total_urgency += urgency;

      retreat_dx -= (enemy.x - this.x) * urgency;
      retreat_dy -= (enemy.y - this.y) * urgency;
    }

    return [retreat_dx, retreat_dy, total_urgency, num_enemies];
  }
}


export function moveEntityWithUserInput (entity, tick) {
  const game  = entity.game;
  const speed = entity.character.speed ?? entity.speed ?? 2;

  // Handle movement
  //
  let dx = 0;
  let dy = 0;

  let num_inputs_x = 0;
  let num_inputs_y = 0;

  // Move by dragging the mouse

  if (entity.game.pointer_on) {
    const vmin = Math.min(window.innerHeight, window.innerWidth);
    const pointer_theta    = Math.atan2(game.pointer_dy, game.pointer_dx);
    const pointer_distance = Math.sqrt(game.pointer_dy * game.pointer_dy, game.pointer_dx * game.pointer_dx);
    const drag_full_radius = Math.min(20, vmin * 0.1);
    const speed_ratio = Math.min(pointer_distance / drag_full_radius, 1);
    dx += Math.cos(pointer_theta) * speed_ratio;
    dy += Math.sin(pointer_theta) * speed_ratio;
    num_inputs_x++;
    num_inputs_y++;
  }

  // Handle WASD and arrow keys

  if (game.keys.KeyA) { dx -= 1; num_inputs_x++; };
  if (game.keys.KeyD) { dx += 1; num_inputs_x++; };
  if (game.keys.KeyW) { dy -= 1; num_inputs_y++; };
  if (game.keys.KeyS) { dy += 1; num_inputs_y++; };

  if (game.keys.ArrowLeft ) { dx -= 1; num_inputs_x++; };
  if (game.keys.ArrowRight) { dx += 1; num_inputs_x++; };
  if (game.keys.ArrowUp   ) { dy -= 1; num_inputs_y++; };
  if (game.keys.ArrowDown ) { dy += 1; num_inputs_y++; };

  // Handle gamepad input

  GAMEPAD:
  if (entity.game.gamepad_index !== null) {
    const gamepads = navigator.getGamepads();
    const gamepad  = gamepads[entity.game.gamepad_index || 0];

    if (!gamepad)
      break GAMEPAD;

    const gamepad_x = gamepad.axes[0];
    const gamepad_y = gamepad.axes[1];

    // Left stick
    if (Math.abs(gamepad_x) > 0.1) { dx += gamepad_x; num_inputs_x++; }
    if (Math.abs(gamepad_y) > 0.1) { dy += gamepad_y; num_inputs_y++; }

    // D-Pad
    if (gamepad.buttons[14].pressed) { dx -= 1; num_inputs_x++; } // left
    if (gamepad.buttons[15].pressed) { dx += 1; num_inputs_x++; } // right
    if (gamepad.buttons[12].pressed) { dy -= 1; num_inputs_y++; } // up
    if (gamepad.buttons[13].pressed) { dy += 1; num_inputs_y++; } // down
  }

  // Average out all input sources
  if (num_inputs_x) dx /= num_inputs_x;
  if (num_inputs_y) dy /= num_inputs_y;

  // If there are inputs, cancel an existing move destination.
  // Otherwise, move towards the move destination.

  if (num_inputs_x + num_inputs_y > 0) {
    entity.move_to = null;

  } else if (entity.move_to) {
    const [target_x, target_y] = entity.move_to;

    const rise = target_y - this.y;
    const run  = target_x - this.x;

    const step = Math.sqrt(Math.min(
      rise * rise + run * run,
      speed * speed
    ));

    if (step < speed) {
      this.move_to = null;
    }

    const theta = Math.atan2(rise, run);
    return [
      Math.cos(theta) * step,
      Math.sin(theta) * step,
    ];
  }

  // Return a per-tick velocity vector

  const theta = Math.atan2(dy, dx);
  const vx    = Math.abs(dx) * Math.cos(theta) * speed;
  const vy    = Math.abs(dy) * Math.sin(theta) * speed;

  return [vx, vy];
}


export function moveEntityOrbitPlayer (entity, tick) {
  entity.tick_offset  ??= Math.random() * 36000 >> 0;
  entity.orbit_radius ??= Math.random() * 8 * entity.radius + 4 * entity.state.player.radius;

  tick += entity.tick_offset;

  const entity_speed = entity?.character.speed ?? entity.speed ?? 2;
  const orbit_speed  = entity_speed / 2;

  const orbit_radius = entity.orbit_radius;
  
  // The angle in orbit we are targetting at this point in time.
  const orbit_theta  = orbit_speed * tick / orbit_radius;

  const target_x = entity.state.player.x + Math.cos(orbit_theta) * orbit_radius;
  const target_y = entity.state.player.y + Math.sin(orbit_theta) * orbit_radius;

  const rise = target_y - entity.y;
  const run  = target_x - entity.x;

  const target_theta = Math.atan2(rise, run);

  const orbit_dx = Math.cos(target_theta);
  const orbit_dy = Math.sin(target_theta);

  const entity_speed_a2b2   = entity_speed * entity_speed;
  const target_a2b2         = rise * rise + run * run;
  const orbit_step_distance = Math.sqrt(Math.min(entity_speed_a2b2, target_a2b2));

  const orbit_vector = [orbit_dx * orbit_step_distance, orbit_dy * orbit_step_distance];

  let movement_vector = orbit_vector;

  // Don't charge into enemies

  if (entity.map && entity.getRetreatVector) {
    let retreat = entity.retreat;
    
    if (
      !retreat ||
      tick  % this.character.retreat_sampling_rate == 0
    ){
      this.retreat = retreat = entity.getRetreatVector();
    }

    const [retreat_dx, retreat_dy, total_urgency, num_enemies] = retreat;

    if (total_urgency > this.character.retreat_min_urgency) {
      const retreat_theta = Math.atan2(retreat_dy, retreat_dx);

      const retreat_vector = [
        Math.cos(retreat_theta) * entity_speed,
        Math.sin(retreat_theta) * entity_speed,
      ];

      movement_vector = [
        (movement_vector[0] + (1+total_urgency) * retreat_vector[0]) / (2+total_urgency),
        (movement_vector[1] + (1+total_urgency) * retreat_vector[1]) / (2+total_urgency),
      ];
    }
  }

  return movement_vector;
}


export const player_characters = [
  new Character ({
    name:       "Knight",
    sprite_i:          8,
    sprite_offset_x:  -6,

    base_stats: {
      max_hp:           16,
      range:            70,
      attack_damage:     8,
      pierce:            3,
      attack_cooldown:  24,
      damage_cooldown:  25,
      attack_spread:    Math.PI/4,
      projectile_speed: 16,
      hitbox:           24,
      speed:             2.4,

      attack_radius:     16,
      attack_end_radius: 24,
    },

    level_up_options: [
      { stat: "max_hp", increment: 2, only_on: "follower" },
      { stat: "max_hp", increment: 6, only_on: "leader"   },

      { stat: "pierce", increment: 1.5 },
      { stat: "attack_damage", increment: 2 },
      { stat: "attack_cooldown", min: 18 },
      { stat: "range", max: 100, increment: 10 },
      { stat: "speed", max: 4, increment: 0.2 },
      { stat: "retreat_sampling_rate", min: 4, only_on: "follower" },
    ],
  }),

  new Character ({
    name:        "Rogue",
    sprite_i:          3,

    base_stats: {
      max_hp:            5,
      range:           100,
      pierce:            1,
      attack_damage:    16,
      attack_radius:     2,
      attack_cooldown:  22,
      damage_cooldown:  30,
      hitbox:           18,
      speed:             6,

      // The rogue needs faster sampling, or he runs into enemies
      retreat_sampling_rate: 10,
    },

    level_up_options: [
      { stat: "max_hp" },
      { stat: "pierce", increment: 0.75 },
      { stat: "attack_damage" },
      { stat: "attack_cooldown", min: 16 },

      { stat: "range", max: 120, increment:  5, only_on: "follower" },
      { stat: "range", max: 160, increment: 10, only_on: "leader"   },

      { stat: "retreat_sampling_rate", min: 4, only_on: "follower" },
    ],
  }),

  new Character ({
    name:       "Archer",
    sprite_i:          2,

    base_stats: {
      max_hp:            8,
      range:           400,
      projectile_speed: 16,
      pierce:            2,
      attack_damage:    10,
      attack_cooldown:  30,
      damage_cooldown:  35,
      speed:             4,
      attack_spread:    Math.PI/10,
      hitbox:           20,

      retreat_range:       200,
      //retreat_min_urgency: 0.6,
    },

    level_up_options: [
      { stat: "max_hp" },
      { stat: "pierce", max: 6 },
      { stat: "attack_damage" },
      { stat: "attack_cooldown", min: 20 },
      { stat: "range", max: 600, increment: 50 },

      { stat: "attack_spread", min: 0, increment:   Math.PI/50, only_on: "follower" },
      { stat: "attack_spread", min: 0, increment: 2*Math.PI/50, only_on: "leader"   },
    ],
  }),

  new Character ({
    name:          "Mage",
    sprite_i:          14,
    sprite_offset_x:   -6,

    base_stats: {
      max_hp:             4,
      range:            250,
      pierce:             4,
      attack_damage:      6,
      attack_radius:     30,
      attack_cooldown:   45,
      attack_spread:    Math.PI/8,
      damage_cooldown:   15,
      hitbox:            14,
      speed:              2.8,
      projectile_speed:   8,

      retreat_range:    100,
    },

    level_up_options: [
      { stat: "max_hp" },
      { stat: "attack_damage" },
      { stat: "pierce", increment: 1 },
      { stat: "attack_cooldown", min: 20, increment: 5 },
      { stat: "range", max: 600, increment: 50 },
      { stat: "speed", max: 4,   increment: 0.2 },

      { stat: "level_up_rate", increment: 1.5, only_on: "follower" },
      { stat: "level_up_rate", increment: 3,   only_on: "leader"   },
    ],
  }),

  new Character({
    name:       "Priest",
    sprite_i:         12,

    base_stats: {
      max_hp:            6,
      range:           130,
      pierce:            6,
      attack_damage:     4,
      attack_cooldown:   6,
      attack_spread:   Math.PI,
      damage_cooldown:  40,
      hitbox:           16,
      projectile_speed:  8,

      attack_radius:     8,
      attack_end_radius: 2,
    },

    level_up_options: [
      { stat: "max_hp", increment: 2 },

      { stat: "attack_damage", increment: 0.5,  only_on: "follower" },
      { stat: "attack_damage", increment: 0.75, only_on: "leader"   },

      { stat: "attack_cooldown", min: 2, increment: 0.5 },
      { stat: "range", max: 200, increment: 10 },
      { stat: "speed", max: 4,   increment: 0.2 },
      { stat: "level_up_rate", increment: 1.9 },
      { stat: "pierce" },
      { stat: "retreat_sampling_rate", min: 10, only_on: "follower" },
    ],
  }),

  new Character({
    name:      "Peasant",
    sprite_i:         32,

    base_stats: {
      max_hp:           10,
      range:           125,
      attack_damage:     6,
      pierce:            4,
      attack_cooldown:  30,
      hitbox:           24,
      speed:             5,
      projectile_speed: 10,

      attack_radius:     2,
      attack_end_radius: 4,
    },

    level_up_options: [
      { stat: "max_hp",                increment: 2 },
      { stat: "attack_damage" },
      { stat: "attack_cooldown",       increment: 2, min: 10 },
      { stat: "range",                 max: 175,         increment: 10 },
      { stat: "speed",                 max: 7,           increment: 0.25 },
      { stat: "pierce",                increment: 1.5 },
      { stat: "retreat_sampling_rate", min: 10,          only_on: "follower" },
      { stat: "level_up_rate",         increment: 6,     only_on: "leader" },
    ],
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
