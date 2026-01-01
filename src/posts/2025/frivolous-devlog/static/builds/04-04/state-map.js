import { State, ElementState } from "./state.js";

import Enemy  from "./enemy.js";
import Entity from "./entity.js";
import Coin   from "./coin.js";

import { EntityMap, TileMap, TILE_HAS_SHADOW, TILE_IS_EXIT } from "./map.js";
import { enemy_characters   } from "./enemy.js";
import PauseState from "./state-pause.js";

import { drawBar, drawFillRect, assignInto, chooseRandomFrom } from "./utils.js";

import {
  Player, moveEntityWithUserInput, moveEntityOrbitPlayer
} from "./player.js";


export class MapState extends State {
  init (obj={}) {
    if (obj.name) {
      this.name = "map:" + name;
    } else {
      this.name = "map";
    }

    this.level_name = obj.level_name || null;

    if (!obj.tile_map) {
      this.tile_map = new TileMap();
    } else {
      if (obj.tile_map instanceof TileMap) {
        this.tile_map = obj.tile_map;
      } else {
        this.tile_map = new TileMap(obj.tile_map);
      }
    }

    this.map          = new EntityMap();
    this.map.state    = this;
    this.map.game     = this.game;
    this.map.tile_map = this.tile_map;

    this.gamemaster = obj.gamemaster || null;

    this.player_spawn_x = obj.player_spawn_x ?? null;
    this.player_spawn_y = obj.player_spawn_y ?? null;

    this.player = obj.player || null; //TODO: look for code where null values aren't checked, or ensure a default value
    this.player.controller   = moveEntityWithUserInput;
    this.party_characters = obj.party_characters || [];
    this.followers = [];

    // If the player kills this number of enemies, they win!
    this.kill_requirement = obj.kill_requirement || null;
    this.enemies_killed = 0;

    // The result stores information about the gameplay result, whether the map was won or lost
    this.result = null;

    this.assign_result_into = obj.assign_result_into || null;
    
    this.quit_until = obj.quit_until || this;

    this.camera_x            = 0;
    this.camera_y            = 0;
    this.camera_zoom         = 1;
    this.camera_target       = this.player;
    this.camera_target_range = 0.46; // 23% of vmin

    this.background_element = obj.background_element || null;
    this.enemy_num = 0;

    this.ticks = 0;
  }

  onPush () {
    this.map.game = this.game;

    let player_spawn_x;
    let player_spawn_y;

    if (this.player_spawn_x != null && this.player_spawn_y != null) {
      player_spawn_x = this.player_spawn_x;
      player_spawn_y = this.player_spawn_y;

    } else {
      let center_x = 0;
      let center_y = 0;
      let spawn_x  = 0;

      if (this.tile_map) {
        center_x = this.tile_map.tiles_w * this.tile_map.tile_size / 2;
        center_y = this.tile_map.tiles_h * this.tile_map.tile_size / 2;
        spawn_x  = center_x;

        // As long as the player is stuck in a wall, nudge them right
        while (this.tile_map.circleCollidesSolid(spawn_x, center_y, 144)) {
          spawn_x += this.player.radius + 1;
        }
      }

      player_spawn_x = spawn_x;
      player_spawn_y = center_y;
    }


    this.map.spawnEntity(this.player, player_spawn_x, player_spawn_y);
    this.camera_x = player_spawn_x;
    this.camera_y = player_spawn_y;

    this.updateCamera();

    for (let character of this.party_characters) {
      const follower_entity = new Player(character);
      follower_entity.controller = moveEntityOrbitPlayer;
      this.followers.push(follower_entity);
      this.map.spawnEntity(follower_entity, player_spawn_x, player_spawn_y);
    }

    this.adjustBackgroundElement();
    this.game.pushState(new MapInterfaceState());
  }

  onPop () {
    for (let next=this.next; next; next = next.next) {
      if (next.map_state === this)
        next.pop();
    }
  }

  onClick (e) {
    if (!this.player) {
      return;
    }

    if (game.pointer_dx + game.pointer_dy > 8) {
      return;
    }

    const click_x  = e.screenX;
    const click_y  = e.screenY;

    const canvas_w = this.canvas.width;
    const canvas_h = this.canvas.height;

    const map_click_x = this.camera_x + (click_x - canvas_w/2) / this.camera_zoom;
    const map_click_y = this.camera_y + (click_y - canvas_h/2) / this.camera_zoom;

    this.player.move_to = [map_click_x, map_click_y];
  }

  onKeyDown (e) {
    switch (e.code) {
      case "KeyK":
        this.onPlayerDeath();
        return;

      case "Backspace":
      case "Escape":
        this.onPause();
        return;
    }

    super.onKeyDown(e);
  }

  onTick (tick) {
    this.ticks++;

    const canvas_width  = this.canvas.width;
    const canvas_height = this.canvas.height;

    super.onTick(tick);

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

    this.updateCamera();

    // Game over if the player dies
    //
    if (this.player.character.hp <= 0) {
      this.onPlayerDeath();
    }

    if (this.tile_map.circleCollidesMask(
      this.player.x, this.player.y, this.player.radius + 4,
      TILE_IS_EXIT
    )){
      this.setResult("win");
    }

    switch (this.result) {
      case "lose":
      case "death":
        this.game.pushState(new DeathState({ map_state: this }));
        break;

      case "win":
        this.game.pushState(new WinState({ map_state: this }));
        break;
    }
  }

  updateCamera () {
    const target = this.camera_target;

    if (!this.camera_target) {
      return;
    }

    // Have the camera follow a target

    const canvas_width  = this.canvas.width;
    const canvas_height = this.canvas.height;

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

    // Move the background with the camera
    //
    if (this.background_element) {
      this.adjustBackgroundElement(this.background_element);
    }
  }

  onEntityKillsOther (entity, other) {
    if (entity instanceof Player) {
      this.enemies_killed++;
      if (this.kill_requirement != null && this.enemies_killed >= this.kill_requirement) {
        this.setResult("win");
      }

      this.map.spawnEntity(new Coin(), other.x, other.y);
    }
  }

  onDraw (tick, time) {
    const canvas_half_width  = this.canvas.width  / 2;
    const canvas_half_height = this.canvas.height / 2;
    const tile_size =  this.tile_map?.tile_size || 76;

    let top    = this.camera_y - canvas_half_height / this.camera_zoom - tile_size;
    let bottom = this.camera_y + canvas_half_height / this.camera_zoom + tile_size;
    let left   = this.camera_x - canvas_half_width  / this.camera_zoom - tile_size * 2;
    let right  = this.camera_x + canvas_half_width  / this.camera_zoom + tile_size;

    // Round top and left to the nearest tile start
    top  = tile_size * Math.floor(top  / tile_size);
    left = tile_size * Math.floor(left / tile_size);

    let left_has_shadow = false;

    // First, draw shadows
    this.ctx.save();
    for (let y=top; y < bottom; y += tile_size) {
      left_has_shadow = false;

      for (let x=left; x < right; x += tile_size) {
        if (!(this.tile_map.getTile(x, y) & TILE_HAS_SHADOW)) {
          left_has_shadow = false;
          continue;
        }

        let width_adjust = 0;
        if (! left_has_shadow) {
          width_adjust = tile_size/4;
        }

        drawFillRect(
          this.ctx,
          canvas_half_width  + (x - this.camera_x + tile_size/6 - width_adjust) * this.camera_zoom,
          canvas_half_height + (y - this.camera_y + tile_size/2) * this.camera_zoom,
          (tile_size + width_adjust) * this.camera_zoom,
          tile_size * this.camera_zoom,
          "#0004"
        );

        left_has_shadow = true;
      }
    }
    this.ctx.restore();

    for (let y=top; y < bottom; y += tile_size) {
      // Draw the row in this tile map, if defined

      DRAW_TILE_ROW:
      if (this.tile_map && (y % tile_size == 0)) {
        let tile_y = (y / tile_size) >> 0;
        const tile_row = this.tile_map.rows[tile_y];

        if (!tile_row)
          break DRAW_TILE_ROW;

        let x = 0;
        let tile_x = 0;

        this.ctx.save();

        for (let tile_code of tile_row) {
          const tile_index = tile_code & this.tile_map.tile_mask;
          const drawTile   = this.tile_map.tile_renderer_index[tile_index];

          if (drawTile) {
            drawTile(
              this.ctx, tile_x, tile_y,
              canvas_half_width  + (x - this.camera_x) * this.camera_zoom,
              canvas_half_height + (y - this.camera_y) * this.camera_zoom,
              this.camera_zoom
            );
          }

          tile_x++;
          x += tile_size;
        }

        this.ctx.restore();
      }

      // Draw entities in this row

      this.map.applyRowEntities((entity) => {
        entity.onDraw(
          tick, time,
          this.camera_x - canvas_half_width  / this.camera_zoom,
          this.camera_y - canvas_half_height / this.camera_zoom,
          this.camera_zoom,
        );
      }, y, y+tile_size);
    }

    const player_character = this.player.character;
    const hp_ratio = player_character.hp / player_character.max_hp;

    drawBar(this.ctx, hp_ratio, 16, 16, 200, 24);
  }

  adjustBackgroundElement (element=null) {
    if (element === null) {
      element = this.background_element;
    }

    const canvas_width  = this.canvas.width;
    const canvas_height = this.canvas.height;

    this.background_element.style['background-size']       = `${312 * this.camera_zoom}px`;
    this.background_element.style['background-position-x'] = `${canvas_width /2 - this.camera_x * this.camera_zoom}px`;
    this.background_element.style['background-position-y'] = `${canvas_height/2 - this.camera_y * this.camera_zoom}px`;
  }

  onPlayerDeath () {
    this.setResult("death");
  }

  setResult (result) {
    this.result = result;

    if (this.assign_result_into)
      assignInto([this.assign_result_into, "level_result"], result);
  }

  onPause () {
    game.pushState(new PauseState({
      title:      this.level_name,
      quit_until: this.quit_until,
    }));
  }

  chooseRandomPartyMember (include_leader=true) {
    if (include_leader) {
      return chooseRandomFrom([this.player, ...this.followers]);
    } else {
      return chooseRandomFrom(this.followers);
    }
  }

  getPartyCoins () {
    let count = this.player.character.coins;
    for (let entity of this.followers) {
      count += entity.character.coins;
    }
    return count;
  }
}


export class WinState extends ElementState {
  constructor (obj={}) {
    super({ ...obj, element: {
      tag: "section",
      classes: "win-screen layer dim",
      style: {
        padding: "0.5em",

        display:        "flex",
        flexDirection:  "column",
        justifyContent: "center",
      },

      children: [
        { tag: "div",
          classes: "win-screen panel",
          style: {
            width:      "80%",
            maxWidth:   "600px",
            margin:     "1em auto",
            padding:    "0.5em",
            background: "#222",
            color:      "white",
            border:     "4px inset #888",
          },

          children: [
            { tag: "h2", text: "Level Passed" },
            { tag: "p", classes: "kill-count" },
            { tag: "p", classes: "duration" },

            { tag: "footer",
              style: {
                display: "flex",
                justifyContent: "end",
              },
              children: [{ tag: "button", classes: "continue", text: "continue" }]
            },
          ]
        }
      ]
    }});

    this.map_state = obj.map_state || null;

    this.kill_counter = this.element.querySelector("p.kill-count");

    this.element.querySelector("button.continue").addEventListener("click", (e) => {
      this.onContinue();
    });
  }

  onContinue () {
    if (this.map_state) {
      this.popUntilState(this.map_state);
    }
  }

  onPush () {
    super.onPush();

    if (!this.map_state) {
      return;
    }

    const num_killed = this.map_state?.enemies_killed ?? null;

    if (num_killed != null) {
      this.kill_counter.textContent = `Enemies killed: ${num_killed}`;
    }

    const level_ticks = this.map_state.ticks;
    const level_time  = level_ticks * 1000/60 >> 0;
    const level_ms    = level_time % 1000;
    const level_sec   = level_time / 1000 >> 0;
    
    this.element.querySelector("p.duration").textContent = (
        `Duration: ${(level_sec / 60 >> 0).toString().padStart(2, "0")}:${(level_sec % 60).toString().padStart(2, "0")}:${level_ms.toString().padStart(3, "0")}`
      );
  }

  onDraw (tick, time) {
    this.prev?.onDraw(tick, time);
    this.element.hidden = false;
  }
}


export class DeathState extends State {
  constructor (obj={}) {
    super(obj);

    this.flash_intensity = 0.6;
    this.flash_duration  = Math.PI * 100;
    this.fade_duration   = this.flash_duration * 2;
    this.flash_end       = this.flash_duration;
    this.fade_end        = this.flash_end + this.fade_duration;
    this.map_state       = obj.map_state || null;;
  }

  onTick (tick) {
    if (this.duration < this.fade_end) {
      return;
    }

    if (this.map_state)
      this.popUntilState(this.map_state);
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


export class MapInterfaceState extends ElementState {
  constructor (obj={}) {
    super({
      ...obj,
      passthrough: true,
      element: {
        tag: "div",
        classes: "layer map-interface",
        children: [
          { tag: "button",
            text: "Pause",
            classes: "pause",
            style: {
              position: "absolute",
              top: "1em",
              right: "1em",
            },
            attributes: { tabindex: "-1" },
          },

          { classes: "gold-counter",
            style: {
              position:   "absolute",
              bottom:     "2.1em",
              left:       "1em",
              fontSize:   "0.90em",
              userSelect: "none",
              color:      "white",
            },
            children: [
              { tag: "span", classes: "label", text: "Gold:" },
              { tag: "span", classes: "value", text: "0" },
            ],
          },

          { classes: "kill-counter",
            style: {
              position:   "absolute",
              bottom:     "1em",
              left:       "1em",
              fontSize:   "0.90em",
              userSelect: "none",
              color:      "white",
            },
            children: [
              { tag: "span", classes: "label", text: "Kills:" },
              { tag: "span", classes: "value", text: "0" },
              { tag: "span", classes: "requirement"},
            ],
          },
        ],
      }
    });

    this.map_state = null;

    this.gold_counter_value_element = this.element.querySelector(".gold-counter .value");
    this.kill_counter_value_element = this.element.querySelector(".kill-counter .value");
    this.kill_requirement_element   = this.element.querySelector(".kill-counter .requirement");

    this.element.querySelector("button.pause")
      .addEventListener("click", (e) => {
        this.map_state?.onPause();
      });
  }

  onDraw (tick, time) {
    super.onDraw(tick, time);

    if (this.map_state) {
      this.kill_counter_value_element.textContent = `${ this.map_state.enemies_killed }`;

      if (this.map_state.kill_requirement > 0) {
        this.kill_requirement_element.textContent = `/ ${ this.map_state.kill_requirement }`;
      } else {
        this.kill_requirement_element.textContent = "";
      }

      const gold = this.map_state.getPartyCoins();
      this.gold_counter_value_element.textContent = gold.toString();;
    }
  }

  onPush () {
    if (this.map_state === null) {
      const map_state = this.findStateInstanceOf(MapState);
      if (!map_state) {
        throw "Could not find MapState";
      }
      this.map_state = map_state;
    }

    super.onPush();
  }
}


export class EnemySpawnState extends State {
  constructor (obj={}) {
    super({...obj,
      name: "spawn-state",
      passthrough: true,
    });

    this.map_state      = obj.map_state || null;
    this.tick_offset    = obj.tick_offset || (Math.random() * 36000 >> 0);
    this.spawn_interval = obj.spawn_interval || 20;
    
    // Each time this spawns an enemy, in a tick,
    // multiply the interval by this amount.
    this.cumulative_rate = obj.cumulative_rate ?? 1;
  }

  onPush () {
    super.onPush();

    // If the map state is not defined, check if it's among the
    // immediate neighbor states

    if (this.map_state) {
      return;

    } else if (this.parent instanceof MapState) {
      this.map_state = this.parent;

    } else if (this.prev instanceof MapState) {
      this.map_state = this.prev;
    }
  }

  onTick (tick) {
    const spawn_interval = Math.round(this.spawn_interval);
    if ((tick + this.tick_offset) % spawn_interval == 0) {
      this.spawnEnemy();
      if (this.cumulative_rate != null && this.cumulative_rate != 1) {
        this.spawn_interval = this.spawn_interval * this.cumulative_rate;
      }
    }

    super.onTick(tick);
  }

  spawnEnemy () {
    const canvas_width  = this.canvas.width;
    const canvas_height = this.canvas.height;

    const map_state = this.map_state;

    const enemy_character_i = (Math.random() * enemy_characters.length) >> 0;

    const enemy = new Enemy(enemy_characters[enemy_character_i]);

    // Spawn the enemy from outside the player's view
    //
    const w = canvas_width  / map_state.camera_zoom;
    const h = canvas_height / map_state.camera_zoom;

    const distance = Math.sqrt(
        Math.pow(w/2, 2) + Math.pow(h/2, 2)
      );

    let theta, x, y;
    let attempts = 0;

    do {
      theta = Math.random() * 2 * Math.PI;
      x     = Math.cos(theta) * distance + map_state.camera_x;
      y     = Math.sin(theta) * distance + map_state.camera_y;
    } while (
      attempts++ < 10 &&
      map_state.tile_map   &&
      (
        x < 0 ||
        y < 0 ||
        x >= map_state.tile_map.tiles_w * map_state.tile_map.tile_size ||
        y >= map_state.tile_map.tiles_h * map_state.tile_map.tile_size ||
        map_state.tile_map.circleCollidesSolid(x, y, enemy.radius)
      )
    );

    if (attempts < 10) {
      map_state.map.spawnEntity(enemy, x, y);
    }
  }
}


export default MapState;
