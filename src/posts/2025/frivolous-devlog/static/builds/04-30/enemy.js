/*
  The enemy object and events
*/

import Entity    from "./entity.js";
import { Character, CharacterEntity } from "./character.js";


export class Enemy extends CharacterEntity {
  constructor (character, target=null) {
    super(character);

    this.target = target;

    this.dx = null;
    this.dy = null;
    this.recalculation_offset = (Math.random() * 20) >> 0;
  }

  onTick (tick) {
    if (this.target === null || this.target.map === null) {
      this.target = this.state?.chooseRandomPartyMember();
    }

    const target = this.target;

    if (!target || target.x == null || target.y == null)
      return;

    const rise = target.y - this.y;
    const run  = target.x - this.x;

    // TODO: If the target, the player is already calculating distance from this enemy. Perhaps there's a way to cache values and get them back?

    const target_distance = Math.sqrt(rise * rise + run * run) - (target.radius || 0) * 0.5;

    if (
      (tick + this.recalculation_offset) % 20 == 0 ||
      this.dx == null ||
      this.dy == null
    ){
      this.recalculateDirection(rise, run, target_distance);
    }

    const step_distance = Math.min(target_distance, this.character.speed || 1);
    this.moveBy(this.dx * step_distance, this.dy * step_distance);
  }

  recalculateDirection (rise, run, target_distance) {
    if (rise == 0 && run == 0) {
      this.dx = 0;
      this.dy = 0;
      return;
    }

    const target_theta  = Math.atan2(rise, run);
    const bias_distance = this.character.target_bias_range - target_distance;

    if (target_distance > bias_distance) {
      this.dx = Math.cos(target_theta);
      this.dy = Math.sin(target_theta);
      return;
    }
    
    // The enemy is inside the biasing range, but outside of the biasing deadzone.

    const bias_coefficient = 1 - Math.min(bias_distance, this.character.target_bias_range) / this.character.target_bias_range;

    // Based on the proportional distance of the enemy within the
    // biasing range, get an angle to add to the direction
    // towards the target. This expression marks the strength of
    // the bias on a left-skewed curve, where the enemy having a
    // further distance makes them more immediately and strongly
    // pulled by the bias, with the bias gradually reducing the
    // closer they get to the target.
    //
    const bias_theta = this.character.target_bias * (1 - Math.pow(2, Math.pow(2*bias_coefficient, 0.5)));
    const direction  = target_theta + bias_theta;

    if (isNaN(direction)) {
      throw "Direction is NaN";
    }

    this.dx = Math.cos(direction);
    this.dy = Math.sin(direction);
  }

  onHit (tick, source, damage) {
    const hit_value = super.onHit(tick, source, damage);
    
    if (this.character.hp <= 0) {
      this.despawn();
      source?.onKillOther(this);
    }

    return hit_value;
  }

  onDraw (tick, time, ox=0, oy=0, scale=1) {
    if (this.character.does_steps) {
      oy += Math.sin((tick + this.recalculation_offset)/3) * 2 * scale;
    }

    super.onDraw(
        tick, time,
        ox, oy,
        scale
      );
  }
}


export const enemy_characters = [
  new Character ({
    name:        "Skeleton",
    spritesheet: "monsters",
    sprite_i:    48,

    base_stats: {
      max_hp:            6,
      attack_damage:     2,
      damage_cooldown:  10,
      hitbox:           20,
      speed:             1.8,
    },
  }),

  new Character ({
    name:        "SkeletonArcher",
    spritesheet: "monsters",
    sprite_i:    49,

    base_stats: {
      max_hp:            3,
      damage_cooldown:  10,
      hitbox:           20,
      speed:             1.2,
      attack_damage:     3,

      target_bias_range:  1200,
      target_bias_min:     0.3,
      target_bias_spread:  0.9,
    },
  }),

  new Character ({
    name:        "SkeletonMage",
    spritesheet: "monsters",
    sprite_i:    50,

    base_stats: {
      max_hp:           12,
      attack_damage:     5,
      damage_cooldown:  10,
      hitbox:           20,
      speed:             1,
    },
  }),

  new Character ({
    name:        "SkeletonLord",
    spritesheet: "monsters",
    sprite_i:    51,

    base_stats: {
      max_hp:           20,
      attack_damage:     4,
      damage_cooldown:  10,
      hitbox:           20,
      speed:             0.85,
    },
  }),

  new Character ({
    name:        "Ghost",
    spritesheet: "monsters",
    sprite_i:    60,

    does_steps: false,

    base_stats: {
      max_hp:            4,
      damage_cooldown:   6,
      hitbox:           20,

      attack_damage: 1,

      speed: 2.8,

      target_bias_range:  1200,
      target_bias_min:     0.3,
      target_bias_spread:  0.5,
    },
  }),
];

export default Enemy;
