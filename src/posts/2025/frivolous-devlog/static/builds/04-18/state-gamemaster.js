import { State, ElementState, CanvasLayerState } from "./state.js";

import { Player, player_characters } from "./player.js";
import { MapState, EnemySpawnState } from "./state-map.js";
import CharacterSelectState from "./state-character-select.js";


class GamemasterState extends State {
  constructor (obj={}) {
    super(obj);

    this.game_level                 = obj.game_level ?? 1;
    this.player_character           = obj.player_character || null;
    this.follower_characters        = obj.follower_characters || [];
    this.kill_requirement_per_level = obj.kill_requirement_per_level ?? 12;
    this.kill_requirement_base      = obj.kill_requirement_base ?? 10;
    this.quit_until                 = obj.quit_until || null;
    this.follower_join_interval     = obj.follower_join_interval || 2;
    this.max_party_size             = obj.max_party_size || 3;

    this.level_result = null;
  }

  onTick (tick) {
    if (this.player_character == null) {
      const select_character_state = new CharacterSelectState({
        quit_until:            this,
        assign_character_into: [this, "player_character"],
      });

      game.pushState(select_character_state);
      return;
    }

    switch (this.level_result) {
      case "win":
        this.onWinLevel(); // passthrough
      case null:
        this.startLevel();
        return;

      case "lose":
      case "death":
        this.onLoseLevel();
        return;
    }
  }

  onWinLevel () {
    this.game_level++;
  }

  onLoseLevel () {
    this.onQuit();
  }

  onQuit () {
    if (this.quit_until) {
      this.popUntilState(this.quit_until)
    } else {
      this.pop();
    }
  }

  startLevel () {
    if (
      this.game_level > this.follower_join_interval &&
      this.game_level % this.follower_join_interval == 0
      && this.follower_characters.length < this.max_party_size
    ){
      const follower = player_characters[Math.random() * player_characters.length >> 0];
      this.follower_characters.push(follower);
    }

    this.level_result = null;

    const background_state = game.pushState(new ElementState({
        name:        "map-background",
        tag:         "div",
        classes:     "layer map-background",
        tick_remove: true,
      }));

    this.game.pushState(new CanvasLayerState({ classes:"layer game-canvas"}));

    const map_state = this.game.pushState(new MapState({
        gamemaster:          this,
        player:              new Player(this.player_character),
        follower_characters: this.follower_characters,
        kill_requirement:    this.kill_requirement_base + (this.game_level-1) * this.kill_requirement_per_level,
        background_element:  background_state.element,
        assign_result_into:  [this, "level_result"],
        quit_until:          this,
      }));

    // Base monster spawner
    map_state.pushSubstate(new EnemySpawnState({
      spawn_interval: 60,
    }));

    for (let n=1; n < this.game_level; n++) {
      map_state.pushSubstate(new EnemySpawnState({
        spawn_interval: 400,
      }));
    }

    this.game.pushState(new TextAnnouncementState({
        text: `Level ${this.game_level}`,
      }));
  }
}


class TextAnnouncementState extends ElementState {
  constructor (obj={}) {
    const text = obj.text || "";

    super({...obj, element: {
      classes: "layer",
      passthrough: true,
      style: {
        background:     "#000",
        display:        "flex",
        flexDirection:  "column",
        justifyContent: "center",
      },

      children: [
        { tag: "h2",
          text: text,
          style: {
            maxWidth: "200px",
            fontSize: "3em",
            color:    "white",
            margin:   "0 auto",
            display:  "block",
          }
        }
      ],
    }});

    this.text = text;
    this.ticks = 0;
    this.max_duration = obj.max_duration || 120;

    this.input_freeze_duration = obj.input_freeze_duration || (this.max_duration/2);
  }

  onDraw (tick, time) {
    this.prev?.onDraw(tick, time);
  }

  onTick (tick) {
    if (this.ticks++ > this.max_duration) {
      this.pop();
      return;
    }

    const duration_ratio = 1 - this.ticks/this.max_duration;
    this.element.style.background = `rgba(0 0 0 / ${duration_ratio})`;

    // block passthrough, except for one tick (the map needs a
    // tick to spawn and move the player)

    if (this.ticks++ == 0 || this.ticks > this.input_freeze_duration) {
      this.prev?.onTick(tick);
    }
  }
}

export default GamemasterState;
