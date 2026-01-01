import { State, ElementState, CanvasLayerState } from "./state.js";
import { Player, player_characters } from "./player.js";
import MapState from './state-map.js';
import { makeElement, assignInto } from "./utils.js";


export class CharacterSelectState extends ElementState {
  constructor (obj={}) {
    super({
      ...obj,
      element: {
        tag: "section .character-select .layer .menu",
        children: [
          { text: "Back",
            tag: "button",
            style: {
              fontSize:     "0.36em",
              fontFamily:   "sans-serif",
              padding:      "6px",
              marginBottom: "8px",
            },
            onClick: (e) => this.onBack(),
          },
          { tag: "h2",
            text: obj.title || "Character Selection",
            style: {
              maxWidth: "375px",
            },
          },
        ],
      }
    });

    this.assign_character_into = obj.assign_character_into || null;
    this.directional_input_interval = 6;

    this.quit_until = obj.quit_until || this;

    this.last_directional_input_tick = null;

    this.selected_i = 0;
    this.characters_width = 3;

    this.character_entries = [];

    const character_list_element = makeElement({ classes: "characters-box" });

    const characters = obj.characters || player_characters;

    for (let index in characters) {
      const character = characters[index];

      const image = character.getImage();

      const element = document.createElement("button");

      element.appendChild(image);
      element.appendChild(makeElement({tag: "span", text: character.name}));

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
  }

  onPush () {
    super.onPush();
    this.character_entries[0].element.focus();
    this.element.focus();
  }

  onTick (tick) {
    let vx = 0;
    let vy = 0;

    let enter = false;
    let exit  = false;

    GAMEPAD:
    if (this.game.gamepad_index !== null) {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[this.game.gamepad_index || 0];

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

      // B button
      if (gamepad.buttons[1].pressed) {
        exit = true;
      }
    }

    this.handleDirectionalInput(vx, vy, 12);

    if (enter) {
      this.onEnter();
    } else if (exit) {
      this.onBack();
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

      case "Backspace":
      case "Escape":
        this.onBack();
        return;
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
    const character = this.character_entries[this.selected_i].character.copy();
    assignInto([this.assign_character_into, "character"], character);
    this.pop();
  }

  onBack () {
    this.popUntilState(this.quit_until);
  }
}


export default CharacterSelectState;
