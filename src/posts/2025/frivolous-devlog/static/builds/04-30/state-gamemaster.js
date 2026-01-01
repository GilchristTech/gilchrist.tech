import {
  TileMap,
  TILE_WALL,
  TILE_ENTRANCE,
  TILE_EXIT,
} from "./map.js";

import { State, ElementState, CanvasLayerState } from "./state.js";

import { Player, player_characters } from "./player.js";

import { MapState, EnemySpawnState } from "./state-map.js";
import CharacterSelectState from "./state-character-select.js";
import LevelUpState from "./state-levelup.js";


export class GamemasterState extends State {
  constructor (obj={}) {
    super(obj);

    this.game_level                 = obj.game_level            ?? 1;
    this.player_character           = obj.player_character      || null;
    this.party_characters           = obj.party_characters      || [];
    this.quit_until                 = obj.quit_until            || null;
    this.party_join_interval        = obj.party_join_interval   || 1;
    this.max_party_size             = obj.max_party_size        || 3;

    this.base_spawner_interval      = obj.base_spawner_interval ??  45;
    this.new_spawner_interval       = obj.new_spawner_interval  ??   8;
    this.new_spawner_cumulative_rate = obj.new_spawner_cumulative_rate ?? 3;

    this.kill_requirement_per_level = obj.kill_requirement_per_level ?? 150;
    this.kill_requirement_base      = obj.kill_requirement_base      ?? 200;

    this.level_state      = null;
    this.level_result     = null;
    this.add_party_member = null;
  }

  onTick (tick) {
    // Only run gamemaster logic if this is the top state.
    if (this.next) {
      return;
    }

    if (this.add_party_member) {
      this.party_characters.push(this.add_party_member);
      this.add_party_member = null;
    }

    if (this.player_character == null) {
      const select_character_state = new CharacterSelectState({
        characters:            player_characters,
        title:                 "Choose Your Party Leader",
        assign_character_into: [this, "player_character"],
        quit_until:            this,
      });

      game.pushState(select_character_state);
      return;
    }

    if (this.level_state === null) {
      this.startLevel();
      return;

    } else {
      switch (this.level_state.result) {
        case "win":
          this.onWinLevel();
          this.exitLevel();

          for (let character of [this.player_character, ...this.party_characters]) {
            if (Math.random() <= 1/Math.max(character.level - character.level_up_rate, 1)) {
              game.enqueueState(new LevelUpState({
                character,
                character_role: (character === this.player_character) ? "leader" : "follower",
              }));
            }
          }

          // If the game level is right, add a party member
          if (
            this.game_level > this.party_join_interval      &&
            this.game_level % this.party_join_interval == 0 &&
            (!this.max_party_size || this.party_characters.length < this.max_party_size)
          ){
            this.startPartyRecruitment();
          }

          return;

        case "lose":
        case "death":
          this.onQuit();
          return;
      }
    }
  }

  onWinLevel () {
    this.game_level++;
  }

  onQuit () {
    if (this.quit_until) {
      this.popUntilState(this.quit_until)
    } else {
      this.pop();
    }
  }

  startLevel () {
    const background_state = game.pushState(new ElementState({
        tag:  "div.layer.map-background",
        name: "map-background",
        tick_remove: true,
        hide:        false,
      }));

    this.game.pushState(
        new CanvasLayerState({ classes:"layer game-canvas"})
      );

    let [tile_map, regions] = this.generateTileMap();

    function collectLeafQuadrants (region) {
      if (!region.quadrants && !region.regions?.quadrants) {
        if (region.w * region.h <= 9 || region.w <= 2) {
          return [];
        }
        return [region];
      }

      let leaves = [];
      for (let quadrant of (region.quadrants || region.regions?.quadrants)) {
        leaves = [...leaves, ...collectLeafQuadrants(quadrant)];
      }

      return leaves;
    }

    regions = collectLeafQuadrants(regions);

    for (let region of regions) {
      region.area ??= region.w * region.h;
      region.center_x = region.x + region.w/2;
      region.center_y = region.y + region.h/2;
    }

    // Iterate over all combinations of regions to find the furthest two.
    let max_a2b2 = 0;
    let furthest_regions = null;

    for (let a=0;   a < regions.length; a++)
    for (let b=a+1; b < regions.length; b++) {
      const region_a = regions[a];
      const region_b = regions[b];

      const rise = region_a.center_y - region_b.center_y;
      const run  = region_a.center_x - region_b.center_x;

      const regions_a2b2 = rise * rise + run * run;

      if (regions_a2b2 > max_a2b2) {
        max_a2b2 = regions_a2b2;
        furthest_regions = [region_a, region_b];
      }
    }

    // Randomly swap the furthest regions
    if (Math.random() < 0.5) {
      furthest_regions = [furthest_regions[1], furthest_regions[0]];
    }

    const player_spawn_x = (furthest_regions[0].center_x-0.5) * tile_map.tile_size;
    const player_spawn_y = (furthest_regions[0].center_y-0.5) * tile_map.tile_size;


    const exit_tx = furthest_regions[1].center_x;
    const exit_ty = furthest_regions[1].center_y;

    tile_map.setTiles(TILE_ENTRANCE, furthest_regions[0].x+0.5, furthest_regions[0].y+0.5);
    tile_map.setTiles(TILE_EXIT, exit_tx, exit_ty);

    const map_state = new MapState({
        gamemaster: this,
        level_name: `Level ${this.game_level}`,
        tile_map:   tile_map,

        player:           new Player(this.player_character),
        party_characters: this.party_characters,
        player_spawn_x,
        player_spawn_y,

        kill_requirement:   this.kill_requirement_base + (this.game_level-1) * this.kill_requirement_per_level,
        assign_result_into: [this, "level_result"],

        background_element: background_state.element,
        quit_until:         this,
      });

    this.game.pushState(map_state);

    // Base monster spawner
    map_state.pushSubstate(new EnemySpawnState({
        spawn_interval: this.base_spawner_interval,
      }));

    for (let n=1; n < this.game_level; n++) {
      map_state.pushSubstate(new EnemySpawnState({
        spawn_interval:  this.new_spawner_interval,
        cumulative_rate: this.new_spawner_cumulative_rate,
      }));
    }

    this.game.pushState(new TextAnnouncementState({
        text: `Level ${this.game_level}`,
      }));

    this.level_state = map_state;
  }

  exitLevel () {
    // Any stat changes the player and their party takes on get
    // kept, except all characters are healed.

    this.player_character    = this.level_state.player.character.copy();
    this.player_character.hp = this.player_character.max_hp;

    const party_characters = [];

    for (let follower of this.level_state.followers) {
      const character = follower.character.copy();
      character.hp = character.max_hp;
      party_characters.push(character);
    }

    this.party_characters = party_characters;

    this.level_state = null;
  }

  startPartyRecruitment () {
    let attempts = 0;

    const character_names = {
      [this.player_character.name]: 1
    };

    for (let character of this.party_characters) {
      character_names[character.name] ??= 1;
      character_names[character.name]  += 1;
    }

    const characters = [];

    while (characters.length < 3 && attempts < 8) {
      const character_index = Math.random() * player_characters.length >> 0;
      const character = player_characters[character_index];

      const num_occurences = character_names[character.name] ?? 0;

      if (Math.random() <= 1 - Math.pow(0.5, num_occurences)){
        continue;
        attempts++;
      }

      character_names[character.name] ??= 1;
      character_names[character.name]  += 1;
      characters.push(character);
    }

    if (characters.length < 2) {
      return;
    }

    game.enqueueState(new CharacterSelectState({
      title: "Choose an Adventurer to Join Your Party",
      characters,
      assign_character_into: [this, "add_party_member"],
      quit_until:            this,
    }));
  }

  generateTileMap (obj={}) {
    const border_thickness = 5;
    const w = 30;
    const h = 30;

    const tile_map = new TileMap({
        tiles_w: w,
        tiles_h: h,
      });

    tile_map.generateBorder(
        TILE_WALL, 0, 0, w, h, border_thickness,
      );

    let regions = tile_map.generateDivisionMaze(
        TILE_WALL,
        border_thickness,
        border_thickness,
        w - border_thickness*2,
        h - border_thickness*2
      );

    return [tile_map, regions];
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
