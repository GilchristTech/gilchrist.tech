import game  from "./game.js";
import State from "./state.js";
import { initAssets } from "./assets.js";
import { drawBar } from "./utils.js";
import { Player, player_characters } from "./player.js";
import Enemy  from "./enemy.js";
import { Entity, EntityMap } from "./entity.js";

game.init();


class MapState extends State {
  init (obj) {
    if (obj.name) {
      this.name = "map:" + name;
    } else {
      this.name = "map";
    }

    this.player = obj.player || new Player();
  }

  onPush () {
    this.map       = new EntityMap();
    this.map.state = this;
    this.map.game  = this.game;

    this.map.spawnEntity(this.player, this.game.w/2, this.game.h/2);
  }

  onKeyDown (e) {
    if (e.code == "KeyK") {
      this.onPlayerDeath();
      return;
    }
  }

  onTick (tick) {
    if (tick % 10 == 0) {
      const enemy = new Enemy();

      // Random enemy sprite
      enemy.sprite_x = (Math.random() *  2) >> 0;
      enemy.sprite_y = (Math.random() * 12) >> 0;

      // Spawn the enemy from outside the player's view
      //
      const distance = Math.sqrt(this.game.w * this.game.w + this.game.h * this.game.h);
      const    theta = Math.random() * 2 * Math.PI;
      const        x = Math.cos(theta) * distance + this.player.x;
      const        y = Math.sin(theta) * distance + this.player.y;

      enemy.target = this.player;

      this.map.spawnEntity(enemy, x, y);
    }

    this.map.update();
    this.map.applySpawnedEntities((entity) => {
      entity.onTick(tick);
    });
    this.map.update();

    // Game over if the player dies
    //
    if (this.player.character.hp <= 0) {
      this.onPlayerDeath();
    }
  }

  onDraw (tick, time) {
    this.map.applyRowEntities((entity) => {
      entity.onDraw();
    });

    const player_character = this.player.character;
    const hp_ratio = player_character.hp / player_character.max_hp;

    drawBar(this.game.ctx, hp_ratio, 16, 16, 200, 24);
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

    const ctx = this.game.ctx;

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
    ctx.fillRect(0, 0, this.game.w, this.game.h);
    ctx.restore();
  }
}


class CharacterSelectState extends State {
  init () {
    this.selected_i = 0;

    this.characters = [];
    for (let character of player_characters) {
      this.characters.push(character);
    }

    this.characters_width = 0;
  }

  onKeyDown (event) {
    // Hitting enter will select the character and start the game
    //
    if (event.code == "Space" || event.code == "Enter") {
      const character  = this.characters[this.selected_i].copy();
      const player     = new Player();

      player.character = character;
      player.sprite_i  = character.sprite_i;

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
          ctx.fillRect(0, 0, state.game.w, state.game.h);
          ctx.restore();
        },
      }));

      this.game.pushState(new MapState({ player, }));
    }
  }

  onTick (tick) {
    // Debounce keyboard input
    if (tick % 6 != 0) {
      return;
    }

    const keys = this.game.keys;
    const left  = keys.KeyA || keys.ArrowLeft;
    const right = keys.KeyD || keys.ArrowRight;
    const up    = keys.KeyW || keys.ArrowUp;
    const down  = keys.KeyS || keys.ArrowDown;

    if (left) {
      const y = (this.selected_i / this.characters_width) >> 0;

      let new_i = this.selected_i - 1;

      if (
        (this.selected_i % this.characters_width == 0) ||
        new_i < 0
      ){
        new_i = (y+1) * this.characters_width - 1;
        new_i = Math.min(new_i, this.characters.length - 1);
      }

      this.selected_i = new_i;
    }

    if (right) {
      const y = (this.selected_i / this.characters_width) >> 0;

      let new_i = this.selected_i + 1;

      if (
        (new_i % this.characters_width == 0) ||
        new_i >= this.characters.length
      ){
        new_i = y * this.characters_width;
      }

      this.selected_i = new_i;
    }

    if (up) {
      const x = this.selected_i % this.characters_width;

      if (this.selected_i >= this.characters_width) {
        this.selected_i -= this.characters_width;
      } else {
        this.selected_i = this.characters.length - 1;
        while (this.selected_i > 0 && this.selected_i % this.characters_width != x)
          this.selected_i--;
      }
    }

    if (down) {
      this.selected_i = this.selected_i + this.characters_width;
      if (this.selected_i >= this.characters.length) {
        this.selected_i %= this.characters_width;
      }
    }
  }

  onDraw (tick, time) {
    const ctx = this.game.ctx;
    const game_w = this.game.w;
    const game_h = this.game.h;

    // Draw a box of characters
    let box_width  = game_w - 144;
    let box_height = game_h - 144;

    // Round down width to the nearest multiple of 72
    box_width -= box_width % 72;

    const top   = 72;
    const left  = game_w/2 - box_width/2 + 72 - 36;
    const right = left + box_width;

    let x = left;
    let y = top;

    let i = 0;

    let characters_width = 0;

    for (let character of this.characters) {
      character.spritesheet.drawCellIndex(ctx, character.sprite_i, x, y, 72, 72);

      if (i == this.selected_i) {
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.rect(x, y, 72, 72);
        ctx.stroke();
        ctx.restore();
      }

      x += 76;

      // If we are on the first row, count columns
      if (y == top) {
        characters_width++;
      }

      // Increment rows when we reach the right edge
      if (x+72 > right) {
        x = left;
        y += 72;
      }

      i++;
    }

    this.characters_width = characters_width;
  }
}


game.enqueueState( new State({
  name: "LoadingState",

  //replace: new MapState(),
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
    drawBar(game.ctx, ratio, 64, game.h/2-32, game.w-128, 64);
  },
}));


function animationFrameLoopCycle (time) {
  game.onAnimationFrame(time);
  window.requestAnimationFrame(animationFrameLoopCycle);
}
window.requestAnimationFrame(animationFrameLoopCycle);
