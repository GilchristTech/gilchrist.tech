import Entity from "./entity.js";
import { Spritesheet, spritesheets } from "./assets.js";


export class Character {
  constructor (obj={}) {
    this.name = obj.name || "character";

    this.__spritesheet = obj.spritesheet || "rogues";
    this.sprite_i = obj.sprite_i || 0;
    this.sprite_offset_x = obj.sprite_offset_x || 0;
    this.sprite_offset_y = obj.sprite_offset_y || 0;

    this.max_hp = obj.max_hp ||  10;
    this.hp     = this.max_hp;

    this.hitbox          = obj.hitbox          ||  36;
    this.range           = obj.range           || 100;
    this.speed           = obj.speed           ||   4;
    this.fire_rate       = obj.fire_rate       ||   1;
    this.pierce          = obj.pierce          ||   1;
    this.attack_damage   = obj.attack_damage   ||   1;
    this.attack_radius   = obj.attack_radius   ||   4;
    this.attack_cooldown = obj.attack_cooldown ||  20;
    this.attack_spread   = obj.attack_spread   || Math.PI / 24;
    this.projectile_speed= obj.projectile_speed||   6;
    this.damage_cooldown = obj.damage_cooldown ||  15;

    this.does_steps = obj.does_steps ?? true;

    this.target_bias_range  = obj.target_bias_range || 450;
    this.target_bias_min    = 0.0;
    this.target_bias_spread = 0.2;

    this.num_killed = 0;
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
    return damage; // return damage received
  }

  onKillOther (other) {
    this.character.num_killed++;

    if (this?.state.onEntityKillsOther)
      this.state.onEntityKillsOther(this, other);
  }
}


export default Character;
