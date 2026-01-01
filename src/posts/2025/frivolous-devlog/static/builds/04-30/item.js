import { Statset } from "./character.js";

export class Item {
  constructor (obj={}) {
    this.name        = obj.name        ?? "item";
    this.description = obj.description ?? null;
    this.spritesheet = obj.spritesheet ?? "items";
    this.sprite_i    = obj.spritesheet ?? 0;
    this.max_charges = obj.max_charges ?? null;
    this.charges     = obj.charges     ?? this.max_charges;
    this.type        = obj.type        ?? "static";

    if (typeof obj.stats === "function") {
      this.stats = obj.stats;
    } else {
      this.stats = new Statset(obj.stats);
    }
  }

  applyToCharacter (character) {
    let stats = this.stats;

    while (!(stats instanceof Statset)) {
      switch (typeof stats) {
        case "function":
          stats = stats(character, this);
          break;
        case "object":
          stats = new Statset(stats);
          break;
        default:
          throw new TypeError(`Unexpected type: ${stats}`);
      }
    }

    stats.applyTo(character);
  }
};


export const items = {
  amulet_of_insight: new Item({
    name: "Amulet of Insight",
    description: "Increases the odds of leveling up, scaling with the wearer's level.",
    type: "static",
    spritesheet: "items",
    stats: (character) => ({
      level_up_rate: character.level * 0.25,
    }),
  }),

  /*
  health_potion: new Item({
    name:        "Red Potion",
    description: "Heals consumer for half their max HP (three uses). Increases max HP with use.",
    type:        "consume",
    max_charges: 3,

    stats: (character) => {
      const stats = {};
      stats.max_hp = 2;
      stats.hp = character.max_hp / 2;

      if (character.hp == character.max_hp) {
        stats.hp += 2;
      }

      if (stats.hp + character.hp > stats.max_hp) {
        stats.hp -= stats.max_hp;
      }

      return stats;
    },
  }),
  */

  thief_boots: new Item({
    name: "Thief Boots",
    description: "Increases speed and response time.",
    type: "static",
    spritesheet: "items",
    stats: (c) => ({
      speed: 2,
      retreat_sampling_rate: -5,
    }),
  }),
};
