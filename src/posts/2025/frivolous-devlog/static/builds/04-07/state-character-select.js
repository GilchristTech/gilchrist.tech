import { State, ElementState, CanvasLayerState } from "./state.js";
import { Player, player_characters } from "./player.js";
import MapState from './state-map.js';

export class CharacterSelectState extends ElementState {
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

  init (obj={}) {
    super.init(obj);
    this.directional_input_interval = 6;
  }

  onPush () {
    this.last_directional_input_tick = null;

    // Only run this once
    if (this.character_entries) {
      return;
    }

    this.element.appendChild(document.createElement("h2"))
      .append("Character Selection");

    this.selected_i = 0;
    this.characters_width = 3;

    this.character_entries = [];

    const character_list_element = document.createElement("div");
    character_list_element.classList = "characters-box";

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
    this.character_entries[0].element.focus();
    super.onPush();
  }

  onTick (tick) {
    let vx = 0;
    let vy = 0;

    let enter = false;

    GAMEPAD:
    if (this.game.gamepad_index !== null) {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[this.game.gamepad_index || 0];
      console.log(gamepad);

      if (!gamepad)
        break GAMEPAD;

      const gamepad_x = gamepad.axes[0];
      const gamepad_y = gamepad.axes[1];

      // Left stick
      if (Math.abs(gamepad_x) > 0.30) vx += gamepad_x;
      if (Math.abs(gamepad_y) > 0.30) vy += gamepad_y;

      // D-Pad
      if (gamepad.buttons[14].pressed) vx -= 1; // left
      if (gamepad.buttons[15].pressed) vx += 1; // right
      if (gamepad.buttons[12].pressed) vy -= 1; // up
      if (gamepad.buttons[13].pressed) vy += 1; // down

      // A button
      if (gamepad.buttons[0].pressed) {
        enter = true;
      }
    }

    this.handleDirectionalInput(vx, vy, 12);

    if (enter) {
      this.onEnter();
    }
  }

  onKeyDown (event) {
    // Hitting enter will select the character and start the game
    //

    let vx = 0;
    let vy = 0;

    switch (event.code) {
      case "KeyA": case "ArrowLeft":  vx -= 1; break;
      case "KeyD": case "ArrowRight": vx += 1; break;
      case "KeyW": case "ArrowUp":    vy -= 1; break;
      case "KeyS": case "ArrowDown":  vy += 1; break;
    }

    this.handleDirectionalInput(vx, vy, false);
  }

  handleDirectionalInput (vx, vy, debounce=null) {
    if (vx == 0 && vy == 0) {
      return;
    }

    if (
      debounce !==  null &&
      debounce !== false &&
      this.game.tick_num <= (this.last_directional_input_tick || 0) + debounce
    ){
      return;
    }

    this.last_directional_input_tick = this.game.tick_num;

    const old_i = this.selected_i;

    const left  = (vx < 0);
    const right = (vx > 0);
    const up    = (vy < 0);
    const down  = (vy > 0);

    if (left) {
      const y = (this.selected_i / this.characters_width) >> 0;

      let new_i = this.selected_i - 1;

      if (
        (this.selected_i % this.characters_width == 0) ||
        new_i < 0
      ){
        new_i = (y+1) * this.characters_width - 1;
        new_i = Math.min(new_i, this.character_entries.length - 1);
      }

      this.selected_i = new_i;

    } else if (right) {
      const y = (this.selected_i / this.characters_width) >> 0;

      let new_i = this.selected_i + 1;

      if (
        (new_i % this.characters_width == 0) ||
        new_i >= this.character_entries.length
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
        this.selected_i = this.character_entries.length - 1;
        while (this.selected_i > 0 && this.selected_i % this.characters_width != x)
          this.selected_i--;
      }

    } else if (down) {
      this.selected_i = this.selected_i + this.characters_width;
      if (this.selected_i >= this.character_entries.length) {
        this.selected_i %= this.characters_width;
      }
    }

    if (this.selected_i != old_i) {
      this.character_entries[this.selected_i].element.focus();
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

        const ctx = state.ctx;

        const alpha = 1 - state.duration / state.fade_duration;

        ctx.save();
        ctx.fillStyle = `rgba(0 0 0 / ${alpha})`;
        ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
        ctx.restore();
      },
    }));

    this.element.hidden = true;

    const background_state = game.pushState(new ElementState({
        name:        "map-background",
        tag:         "canvas",
        classes:     "layer map-background",
        tick_remove: true,
      }));

    this.game.pushState(new CanvasLayerState());

    this.game.pushState(new MapState({
        player,
        background_element: background_state.element,
      }));
  }
}


export default CharacterSelectState;
