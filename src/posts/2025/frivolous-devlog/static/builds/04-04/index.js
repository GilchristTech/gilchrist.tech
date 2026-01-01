import game  from "./game.js";
import { State, ElementState, CanvasLayerState } from "./state.js";
import { initAssets } from "./assets.js";
import { drawBar } from "./utils.js";
import { Player, player_characters } from "./player.js";
import Enemy  from "./enemy.js";
import { Entity, EntityMap } from "./entity.js";


class MapState extends State {
  init (obj) {
    if (obj.name) {
      this.name = "map:" + name;
    } else {
      this.name = "map";
    }

    this.player = obj.player || new Player();
    this.camera_x = 0;
    this.camera_y = 0;
    this.camera_zoom = 1;
    this.camera_target = this.player;
    this.camera_target_range = 0.5; // 25% of vmin
  }

  onPush () {
    this.map       = new EntityMap();
    this.map.state = this;
    this.map.game  = this.game;

    this.map.spawnEntity(this.player, 0, 0);
  }

  onKeyDown (e) {
    if (e.code == "KeyK") {
      this.onPlayerDeath();
      return;
    }
  }

  onTick (tick) {
    const canvas_width  = this.canvas.width;
    const canvas_height = this.canvas.height;

    //Spawn enemies
    
    if (tick % 10 == 0) {
      const enemy = new Enemy();

      // Random enemy sprite
      enemy.sprite_x = (Math.random() *  2) >> 0;
      enemy.sprite_y = (Math.random() * 12) >> 0;

      // Spawn the enemy from outside the player's view
      //
      const w = canvas_width  / this.camera_zoom;
      const h = canvas_height / this.camera_zoom;

      const distance = Math.sqrt(
          Math.pow(w/2, 2) + Math.pow(h/2, 2)
        );

      const theta = Math.random() * 2 * Math.PI;
      const     x = Math.cos(theta) * distance + this.camera_x;
      const     y = Math.sin(theta) * distance + this.camera_y;

      enemy.target = this.player;

      this.map.spawnEntity(enemy, x, y);
    }

    this.map.update();
    this.map.applySpawnedEntities((entity) => {
      entity.onTick(tick);
    });
    this.map.update();

    // Ensure we are zoomed out enough to play the game

    const min_pixels = 575 * 825;
    const num_pixels = canvas_width * canvas_height;

    if (num_pixels < min_pixels) {
      this.camera_zoom = num_pixels / min_pixels;
    }

    // Have the camera follow a target
    //
    if (this.camera_target) {
      const target = this.camera_target;

      const rise  = target.y - this.camera_y;
      const run   = target.x - this.camera_x;
      const theta = Math.atan2(rise, run);

      const spatial_distance = (
          Math.sqrt(rise*rise + run*run) + // Distance from origin point
          (target.radius || 0)             // Keep hitbox edge in view
        );

      const camera_radius   = Math.min(canvas_width, canvas_height)/2;
      const camera_distance = (spatial_distance * this.camera_zoom) / camera_radius;

      const camera_error = camera_distance - this.camera_target_range;

      if (camera_error > 0) {
        this.camera_x += Math.cos(theta) * camera_error * camera_radius;
        this.camera_y += Math.sin(theta) * camera_error * camera_radius;
      }
    }

    // Game over if the player dies
    //
    if (this.player.character.hp <= 0) {
      this.onPlayerDeath();
    }
  }

  onDraw (tick, time) {
    this.map.applyRowEntities((entity) => {
      entity.onDraw(
        this.camera_x - this.canvas.width*0.5/this.camera_zoom,
        this.camera_y - this.canvas.height*0.5/this.camera_zoom,
        this.camera_zoom,
      );
    });

    const player_character = this.player.character;
    const hp_ratio = player_character.hp / player_character.max_hp;

    drawBar(this.ctx, hp_ratio, 16, 16, 200, 24);
  }

  onPlayerDeath () {
    this.game.pushState(new DeathState());
  }
}


class DeathState extends State {
  init () {
    this.flash_intensity = 0.6;

    this.flash_duration = Math.PI * 100;
    this.fade_duration  = this.flash_duration * 2;
    this.flash_end      = this.flash_duration;
    this.fade_end       = this.flash_end + this.fade_duration;
  }

  onTick (tick) {
    if (this.duration < this.fade_end) {
      return;
    }

    const prev = this.prev;
    this.pop();
    prev.pop();
  }

  onDraw (tick, time) {
    this.prev.onDraw(tick, time);

    const ctx = this.ctx;

    let brightness = 0;
    let alpha = 0;

    if (this.duration < this.flash_duration) {
      brightness = 255;
      alpha = Math.sin(this.duration / 50) * this.flash_intensity;

    } else if (this.duration <= this.fade_end) {
      const fade_time = this.duration - this.flash_end;
      brightness = 0;
      alpha = fade_time / this.fade_duration;

    } else {
      brightness = 0;
      alpha = 1;
    }

    ctx.save();
    ctx.fillStyle = `rgba(${brightness} ${brightness} ${brightness} / ${alpha})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }
}


class CharacterSelectState extends ElementState {
  constructor (obj={}) {
    super({
      ...obj,
      tag: "section",
      classes: "character-select layer",
      initialize: false,
    });

    if (obj.initialize === undefined || obj.initialize) {
      this.init(obj);
    }
  }

  onPush () {
    // Only run this once
    if (this.character_entries) {
      return;
    }

    this.element.appendChild(document.createElement("h2"))
      .append("Character Selection");

    this.selected_i = 0;

    this.character_entries = [];

    const character_list_element = document.createElement("div");

    const sprite_canvas = document.createElement("canvas");
    const sprite_ctx    = sprite_canvas.getContext("2d");
    sprite_canvas.width  = 32;
    sprite_canvas.height = 32;
    sprite_canvas.imageSmoothingEnabled = false;

    for (let index in player_characters) {
      const character = player_characters[index];

      // Generate an image data URL of this character
      sprite_ctx.clearRect(0, 0, 32, 32);
      character.spritesheet.drawCellIndex(
          sprite_ctx, character.sprite_i, 0, 0, 32, 32
        );

      const element = document.createElement("button");
      const image   = element.appendChild(new Image());
      image.src     = sprite_canvas.toDataURL();


      element.appendChild(document.createElement("span")).append(character.name);

      element.onclick = ((e) => {
        this.selected_i = index;
        this.onEnter();
      });

      this.character_entries.push({
        index,
        image,
        character,
        element,
      });

      character_list_element.appendChild(element);
    }

    this.element.appendChild(character_list_element);
    super.onPush();
  }

  onKeyDown (event) {
    // Hitting enter will select the character and start the game
    //
    if (event.code == "Space" || event.code == "Enter") {
      this.onEnter();
    }
  }

  onDraw (tick, time) {
    // If this element receives a draw event, stop hiding
    this.element.hidden = false;
  }

  onEnter () {
    /* Take the selected player and start the game */

    const character  = this.character_entries[this.selected_i].character.copy();
    const player     = new Player("player", character);

    this.game.pushState(new State({
      name: "FadeInState",

      init: (state, obj) => {
        state.fade_duration = 2000;
      },

      onTick: (state, tick) => {
        if (state.duration > state.fade_duration) {
          state.pop();
        }
      },

      onDraw: (state, tick, time) => {
        state.prev.onDraw(tick, time);

        const ctx = state.game.ctx;

        const alpha = 1 - state.duration / state.fade_duration;

        ctx.save();
        ctx.fillStyle = `rgba(0 0 0 / ${alpha})`;
        ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
        ctx.restore();
      },
    }));

    this.element.hidden = true;
    this.game.pushState(new MapState({ player, }));
  }
}


game.init();

game.pushState(new CanvasLayerState());

game.pushState( new State({
  name: "LoadingState",

  replace: new CharacterSelectState(),

  onTick: function (state, tick) {
    const [ have, expect, ratio ] = initAssets();
    if (have >= expect) {
      this.pop();
    }
  },

  onDraw: function (state, tick, time) {
    // Draw the loading bar
    const [ have, expect, ratio ] = initAssets();
    drawBar(this.ctx, ratio, 64, this.canvas.height/2-32, this.canvas.width-128, 64);
  },
}));


function animationFrameLoopCycle (time) {
  game.onAnimationFrame(time);
  window.requestAnimationFrame(animationFrameLoopCycle);
}
window.requestAnimationFrame(animationFrameLoopCycle);
