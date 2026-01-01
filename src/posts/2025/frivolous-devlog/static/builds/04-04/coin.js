import { Entity } from "./entity.js";

export class Coin extends Entity {
  constructor (quantity=null) {
    super();
    this.spritesheet = "coins";
    this.radius = 6;

    this.quantity = quantity ?? 1+(Math.random() * 2 >> 0);

    switch (this.quantity) {
      case 0:
      case 1:
        this.sprite_i = 0;
        break;

      default:
      case 2:
        this.sprite_i = 1;
    }
  }
}

export default Coin;
