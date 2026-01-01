import { Spritesheet, spritesheets } from "./assets.js";


export default class Character {
  constructor (obj={}) {
    this.name = obj.name || "character";

    this.__spritesheet = obj.spritesheet || "rogues";
    this.sprite_i = obj.sprite_i || 0;

    this.max_hp = obj.max_hp ||  10;
    this.hp     = this.max_hp;

    this.hitbox          = obj.hitbox          ||  36;
    this.range           = obj.range           || 100;
    this.speed           = obj.speed           ||   4;
    this.fire_rate       = obj.fire_rate       ||   1;
    this.pierce          = obj.pierce          ||   1;
    this.attack_radius   = obj.attack_radius   ||   4;
    this.attack_cooldown = obj.attack_cooldown ||  20;
    this.attack_spread   = obj.attack_spread   || Math.PI / 24; // 7.5°
    this.projectile_speed= obj.projectile_speed||   6;
    this.damage_cooldown = obj.damage_cooldown ||  15;

    this.does_steps = obj.does_steps ?? true;

    this.target_bias_range  = obj.target_bias_range || 450;
    this.target_bias_min    = 0.0;
    this.target_bias_spread = 0.2;
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
