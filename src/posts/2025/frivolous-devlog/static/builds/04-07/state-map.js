import State from "./state.js";

import Enemy  from "./enemy.js";
import { Entity, EntityMap } from "./entity.js";
import { player_characters } from "./player.js";
import { enemy_characters  } from "./enemy.js";

import { drawBar } from "./utils.js";

export class MapState extends State {
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

    this.background_element = obj.background_element || null;
    this.enemy_num = 0;
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

    // Enemy spawning
    //
    if (tick % 10 == 0) {
      this.spawnEnemy();
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

    // Move the background with the camera
    //
    if (this.background_element) {
      this.background_element.style['background-size']       = `${this.camera_zoom * 100}%`;
      this.background_element.style['background-position-x'] = `${canvas_width /2 - this.camera_x * this.camera_zoom}px`;
      this.background_element.style['background-position-y'] = `${canvas_height/2 - this.camera_y * this.camera_zoom}px`;
    }

    // Game over if the player dies
    //
    if (this.player.character.hp <= 0) {
      this.onPlayerDeath();
    }
  }

  spawnEnemy () {
    const canvas_width  = this.canvas.width;
    const canvas_height = this.canvas.height;

    const enemy_character_i = (Math.random() * enemy_characters.length) >> 0;

    const enemy = new Enemy(
        `enemy-${this.enemy_num++}`,
        enemy_characters[enemy_character_i]
      );

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

  onDraw (tick, time) {
    this.map.applyRowEntities((entity) => {
      entity.onDraw(
        tick, time,
        this.camera_x - this.canvas.width *0.5/this.camera_zoom,
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


export class DeathState extends State {
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


export default MapState;
