/*
  The enemy object and events
*/

import { Entity, EntityMap } from "./entity.js";


export class Enemy extends Entity {
  init (name="enemy") {
    this.name = name;
    this.x = 0;
    this.y = 0;
    this.w = 76;
    this.h = 76;

    this.spritesheet = "monsters";
    this.sprite_i = 0;

    this.speed = 2;
    this.target = null;
  }

  onTick (tick) {
    const target = this.target;

    if (!target)
      return;

    this.moveTowards(target.x, target.y, this.speed);
  }
}

export default Enemy;
