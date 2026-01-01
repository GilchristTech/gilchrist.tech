import { State, ElementState } from "./state.js";

import Enemy  from "./enemy.js";
import Entity from "./entity.js";

import { EntityMap, TileMap } from "./map.js";
import { enemy_characters   } from "./enemy.js";
import PauseState from "./state-pause.js";

import { drawBar, assignInto } from "./utils.js";

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

    this.tile_map = null;
    this.tile_map = new TileMap();

    this.map          = new EntityMap();
    this.map.state    = this;
    this.map.game     = this.game;
    this.map.tile_map = this.tile_map;

    this.gamemaster = obj.gamemaster || null;

    this.player = obj.player || null; //TODO: look for code where null values aren't checked, or ensure a default value
    this.player.controller   = moveEntityWithUserInput;
    this.follower_characters = obj.follower_characters || [];
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

    this.map.spawnEntity(this.player, spawn_x, center_y);
    this.camera_x = center_x;
    this.camera_y = center_y;

    for (let character of this.follower_characters) {
      const follower_entity = new Player(character);
      follower_entity.controller = moveEntityOrbitPlayer;
      this.followers.push(follower_entity);
      this.map.spawnEntity(follower_entity, spawn_x, center_y);
    }

    this.game.pushState(new MapInterfaceState());
  }

  onPop () {
    for (let next=this.next; next; next = next.next) {
      if (next.map_state === this)
        next.pop();
    }
  }

  onKeyDown (e) {
    switch (e.code) {
      case "KeyK":
        this.onPlayerDeath();
        return;

      case "Backspace":
      case "Escape":
        game.pushState(new PauseState({ quit_until: this.quit_until }));
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

    // Move the background with the camera
    //
    if (this.background_element) {
      this.background_element.style['background-size']       = `${512 * this.camera_zoom}px`;
      this.background_element.style['background-position-x'] = `${canvas_width /2 - this.camera_x * this.camera_zoom}px`;
      this.background_element.style['background-position-y'] = `${canvas_height/2 - this.camera_y * this.camera_zoom}px`;
    }

    // Game over if the player dies
    //
    if (this.player.character.hp <= 0) {
      this.onPlayerDeath();
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

  onEntityKillsOther (entity, other) {
    if (entity instanceof Player) {
      this.enemies_killed++;
      if (this.kill_requirement != null && this.enemies_killed >= this.kill_requirement) {
        this.setResult("win");
      }
    }
  }

  onDraw (tick, time) {
    const canvas_half_width  = this.canvas.width  / 2;
    const canvas_half_height = this.canvas.height / 2;
    const tile_size =  this.tile_map?.tile_size || 76;

    let top    = this.camera_y - canvas_half_height / this.camera_zoom;
    let bottom = this.camera_y + canvas_half_height / this.camera_zoom + tile_size;

    // Round top to the nearest tile start
    top = tile_size * Math.floor(top / tile_size);

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

  onPlayerDeath () {
    this.setResult("death");
  }

  setResult (result) {
    this.result = result;

    if (this.assign_result_into)
      assignInto([this.assign_result_into, "level_result"], result);
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

    this.kill_counter_value_element = this.element.querySelector(".kill-counter .value");
    this.kill_requirement_element   = this.element.querySelector(".kill-counter .requirement");

    this.element.querySelector("button.pause")
      .addEventListener("click", (e) => {
        game.pushState(new PauseState({ quit_until: this.map_state }));
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
    this.tick_offset    = obj.tick_offset || (Math.random() * 60 >> 0);
    this.spawn_interval = obj.spawn_interval || 20;
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
    if ((tick + this.tick_offset) % this.spawn_interval == 0) {
      this.spawnEnemy();
    }

    super.onTick(tick);
  }

  spawnEnemy () {
    const canvas_width  = this.canvas.width;
    const canvas_height = this.canvas.height;

    const map_state = this.map_state;

    const enemy_character_i = (Math.random() * enemy_characters.length) >> 0;

    const enemy = new Enemy(
        enemy_characters[enemy_character_i],
        map_state.player,
      );

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
