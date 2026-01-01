import Entity from "./entity.js";
import { Spritesheet, spritesheets } from "./assets.js";


export class Statset {
  static stat_info = {
    max_hp: { name: "Max HP", name_full: "Max Hitpoints" },
    hp:     { name: "HP",     name_full: "Hitpoints"     },
    level:  { name: "Level" },
    hitbox: { name: "Hitbox",  name_full: "Hitbox Radius" },
    speed:  { name: "Speed",   name_full: "Movement Speed" },

    pierce: {
      name: "Pierce",
      description: "How many enemies this character's attack will go through.",
    },

    range: {
      name: "Range",
      description: "This character will attack enemies within this radius, and their attacks can extend this far.",
    },

    attack_damage: {
      name: "Damage", name_full: "Attack Damage",
      description: "How much attacks from this character deal to enemies, when hitting them.",
    },

    attack_radius: {
      name: "Attack Size",
      description: "The size of this character's attack projectile."
    },

    attack_cooldown:  { name: "Attack Cooldown" },
    attack_spread:    { name: "Spread", name_full: "Attack Spread" },
    projectile_speed: { name: "Projectile Speed" },

    damage_cooldown: {
      name: "Damage Cooldown",
      description: "How much time this character is invincible after getting hit.",
    },

    retreat_range: {
      name: "Retreat Range",
      description: "The radius at which this character will start to take enemy positions into account in their movement.",
    },

    retreat_sampling_rate: {
      name:      "Response",
      name_full: "Response Time",
      description: "The amount of time taken to change direction in the presense of enemies.",
    },

    level_up_rate: {
      name: "Level-up Rate",
      description: "Improves the chance a character levels up after finishing a game level.",
    },
  };

  constructor (from={}, mode=null) {
    this.name = from.name ?? null;
    this.mode = from.mode ?? mode ?? "+";

    if (typeof from === "number") {
      this[stat_name] = from[stat_name] ?? null;
      return;
    }

    for (let stat_name of Object.keys(Statset.stat_info)) {
      // TODO: assert types
      this[stat_name] = from[stat_name] ?? null;
    }
  }

  applyInplace (other) {
    if (!(other instanceof Statset)) {
      throw new TypeError("Operand is not a Statset");
    }

    switch (other.mode) {
      case "-":
      case "+":
        for (let stat_name of Object.keys(Statset.stat_info)) {
          let value = other[stat_name];
          if (typeof value === "number") {
            if (other.mode === "-") {
              value *= -1;
            }
            this[stat_name] += value
          }
        }
        break;

      case "*":
        for (let stat_name of Object.keys(Statset.stat_info)) {
          let value = other[stat_name];
          if (typeof value === "number") {
            this[stat_name] *= value
          }
        }
        break;

      default: 
        throw `Unrecognized Statset mode: ${other.mode}`;
    }

    return this;
  }

  applyTo (other) {
    return other.applyInplace(this);
  }

  assignTo (other) {
    for (let stat_name of Object.keys(Statset.stat_info)) {
      this[stat_name] = other[stat_name];
    }
  }

  copy () {
    return new Statset(this);
  }
}


export class Character extends Statset {
  constructor (obj={}) {
    super({});
    this.name = obj.name || "character";

    this.__spritesheet = obj.spritesheet || "rogues";
    this.sprite_i = obj.sprite_i || 0;
    this.sprite_offset_x = obj.sprite_offset_x || 0;
    this.sprite_offset_y = obj.sprite_offset_y || 0;

    this.base_stats = new Statset({
      level:                       1,
      max_hp:                     10,
      hitbox:                     36,
      range:                     100,
      speed:                       4,
      pierce:                      1,
      attack_damage:               1,
      attack_radius:               4,
      attack_cooldown:            20,
      attack_spread:    Math.PI / 24,
      projectile_speed:            6,
      damage_cooldown:            15,

      retreat_range:         null,
      retreat_min_urgency:    0.4,
      retreat_sampling_rate:   15,

      level_up_rate:            1,

      ...(obj.base_stats || {})
    });

    this.target_bias_range  = obj.target_bias_range  ?? 450;
    this.target_bias_min    = obj.target_bias_min    ?? 0.0;
    this.target_bias_spread = obj.target_bias_spread ?? 0.2;

    this.target_bias = Math.PI * (
        (2*Math.random()-1) *
        (this.target_bias_spread - this.target_bias_min) +
        this.target_bias_min
      );

    this.does_steps       = obj.does_steps ?? true;
    this.coins            = obj.coins ?? 0;
    this.num_killed       = 0;
    this.level_up_options = obj.level_up_options || null;

    this.hp = this.base_stats.max_hp;

    this.items_max = 0;
    this.items = [];

    this.recalculateStats();
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

  getImage () {
    return this.spritesheet.imageFromCellIndex(this.sprite_i);
  }

  recalculateStats () {
    const hp = this.hp;
    const at_max_hp = (this.hp == this.max_hp);
    this.assignTo(this.base_stats);

    for (let item of this.items) {
      if (item.type != "static") {
        continue;
      }
      item.applyToCharacter(this);
    }

    if (at_max_hp) {
      this.hp = this.max_hp;
    } else {
      this.hp = hp;
    }
  }

  addItem (item) {
    this.items.push(item);
    this.recalculateStats();
  }
}


export class CharacterEntity extends Entity {
  constructor (character) {
    if (!character)
      throw "CharacterEntity character not defined or falsey";

    super(character.name);

    this.character   = character.copy();
    this.damage_tick = 0;

    this.spritesheet = character.spritesheet;
    this.sprite_i    = character.sprite_i;
    this.sprite_offset_x = character.sprite_offset_x;
    this.sprite_offset_y = character.sprite_offset_y;

    this.radius = character.hitbox;

    this.controller = null;

    this.w = 76;
    this.h = 76;
  }

  hitEntity (tick, entity, damage=null) {
    if (entity.onHit)
      return entity.onHit(tick, this, damage ?? this.character.attack_damage);
    return null; // return null, indicating no hit took place
  }

  onHit (tick, source, damage) {
    if (
      tick !== null &&
      tick <= this.damage_tick + this.character.damage_cooldown
    ){
      return null;  // return that the hit didn't take place
    }

    this.damage_tick = tick;
    this.character.hp -= damage;

    if (this.character.hp <= 0) {
      this.onDeath(tick, source, damage);
    }

    return damage; // return damage received
  }

  onDeath () {}

  onKillOther (other) {
    this.character.num_killed++;

    if (this?.state.onEntityKillsOther)
      this.state.onEntityKillsOther(this, other);
  }

  onTick (tick) {
    this.last_x = this.x;
    this.last_y = this.y;

    if (this.controller) {
      const [vx, vy] = this.controller(this, tick);
      if (vx != 0 || vy != 0) {
        this.moveBy(vx, vy);
      }
    }
  }
}


export default Character;
