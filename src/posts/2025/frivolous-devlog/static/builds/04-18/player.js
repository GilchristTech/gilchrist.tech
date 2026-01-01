/*
  The player object and events
*/

import Entity      from "./entity.js";
import Enemy       from "./enemy.js";
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

    let check_damage = (tick >= this.damage_tick + this.character.damage_cooldown);

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

        damage:   character.attack_damage,
        max_hits: character.pierce,
        radius:   character.attack_radius,

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
}


export function moveEntityWithUserInput (entity, tick) {
  const game = entity.game;
  // Handle movement
  //
  let vx = 0;
  let vy = 0;

  if (entity.game.pointer_on) {
    const pointer_theta = Math.atan2(game.pointer_dy, game.pointer_dx);
    vx += Math.cos(pointer_theta);
    vy += Math.sin(pointer_theta);
  }

  if (game.keys.KeyA) vx -= 1;
  if (game.keys.KeyD) vx += 1;
  if (game.keys.KeyW) vy -= 1;
  if (game.keys.KeyS) vy += 1;

  GAMEPAD:
  if (entity.game.gamepad_index !== null) {
    const gamepads = navigator.getGamepads();
    const gamepad  = gamepads[entity.game.gamepad_index || 0];

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

  const speed = entity.character.speed ?? entity.speed ?? 2;
  return [vx * speed, vy * speed];
}


export function moveEntityOrbitPlayer (entity, tick) {
  entity.tick_offset  ??= Math.random() * 36000;
  entity.orbit_radius ??= Math.random() * 8 * entity.radius + 4 * entity.state.player.radius;

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

  let retreat_vector = null;
  const map = entity.map;
  if (map) {
    // Retreat directional vectors
    let retreat_dx = 0;
    let retreat_dy = 0;

    let total_urgency = 0;
    let num_enemies = 0;

    const range = entity.character.range * 0.75;
    const range_a2b2 = range * range;

    for (let [enemy, enemy_a2b2] of map.iterEntitiesWithin(entity.x, entity.y, range)) {
      if (!(enemy instanceof Enemy)) {
        continue;
      }

      num_enemies++;

      let urgency = enemy_a2b2 / range_a2b2;
      urgency *= urgency;

      total_urgency += urgency;

      retreat_dx -= (enemy.x - entity.x) * urgency;
      retreat_dy -= (enemy.y - entity.y) * urgency;
    }

    if (total_urgency > 0.3) {
      const retreat_theta = Math.atan2(retreat_dy, retreat_dx);
      retreat_vector = [
        Math.cos(retreat_theta) * entity_speed,
        Math.sin(retreat_theta) * entity_speed,
      ];

      movement_vector = [
        (movement_vector[0] + retreat_vector[0]) / 2,
        (movement_vector[1] + retreat_vector[1]) / 2,
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
    max_hp:           16,
    range:            78,
    attack_damage:     8,
    pierce:           -1,
    attack_radius:    18,
    attack_cooldown:  20,
    damage_cooldown:  35,
    attack_spread:    Math.PI/4,
    projectile_speed: 16,
    hitbox:           24,
    speed:             2.4,
  }),

  new Character ({
    name:        "Rogue",
    max_hp:            5,
    sprite_i:          3,
    range:           100,
    pierce:            1,
    attack_damage:    18,
    attack_radius:     2,
    attack_cooldown:  24,
    damage_cooldown:  40,
    hitbox:           18,
    speed:             6,
  }),

  new Character ({
    name:      "Archer",
    sprite_i:         2,
    range:          400,
    projectile_speed: 8,
    pierce:           1,
    attack_damage:   15,
    attack_cooldown: 30,
    damage_cooldown: 30,
    speed:            5,
    attack_spread:   Math.PI/10,
    hitbox:          38,
  }),

  new Character ({
    name:          "Mage",
    sprite_i:          14,
    sprite_offset_x:   -6,
    max_hp:             4,
    range:            250,
    pierce:            -1,
    attack_damage:      6,
    attack_radius:     30,
    attack_cooldown:   45,
    attack_spread:    Math.PI/8,
    damage_cooldown:   15,
    hitbox:            14,
    speed:              2.8,
    projectile_speed:   8,
  }),

  new Character({
    name:       "Priest",
    sprite_i:         12,
    range:           128,
    attack_radius:     8,
    pierce:            6,
    attack_damage:     2,
    attack_cooldown:   6,
    attack_spread:   Math.PI,
    damage_cooldown:  40,
    hitbox:           12,
    projectile_speed:  8,
  }),

  new Character({
    name:      "Peasant",
    max_hp:           12,
    sprite_i:         32,
    range:           125,
    attack_damage:     6,
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
