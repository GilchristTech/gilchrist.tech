/*
  Global game data container, initialization, some event processing.
*/

import player from "./player.js";
import { Entity, EntityMap } from "./entity.js";


export class Game {
  constructor () {
    this.ctx = null;
    this.canvas = null;
    this.player = null;

    this.frame_time = null;

    this.tick_num      = 0;
    this.tick_time     = 0;
    this.tick_duration = 1000/60;

    this.w = null;
    this.h = null;
    this.canvas_time = null;

    this.keys = {};

    this.__initialized = false;
  }

  init () {
    window.canvas = game.canvas = document.getElementById("game-canvas");
    window.ctx    = game.ctx    = game.canvas.getContext("2d");
    window.player = game.player = player;

    // Keyboard events

    window.addEventListener("keyup",   (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener("keydown", (e) => {
      this.keys[e.code] ||= e;
      if (this.state)
        this.state.onKeyDown(e);
    });
  }

  refreshCanvasSize () {
    this.w = this.canvas.width  = window.innerWidth;
    this.h = this.canvas.height = window.innerHeight;
  }

  onAnimationFrame (time) {
    if (!document.hasFocus())
      this.keys = {};

    this.frame_time = time;
    this.refreshCanvasSize();

    // Enqueue states from the enqueue stack until there are none left.
    while (this.enqueue_head) {
      const pushed_state = this.enqueue_head;
      const new_head = pushed_state.next;
      if (new_head)
        new_head.prev = null;
      this.enqueue_head = new_head;
      this.pushState(pushed_state);
    }

    // Run ticks until the tick time catches up with the current timestamp.

    while (this.tick_time <= time) {
      let state_head;
      this.tick_num++;
      this.tick_time += this.tick_duration;

      // Run the game state onTick once, then re-run every time
      // it changes. This ensures all onTick events which modify
      // the game state will have the new state's onTick method
      // ran prior to drawing. There is a potential ABA problem
      // here to be wary of when modifying the state stack, so
      // too much cleverness in its use is best avoided.
      //
      do {
        state_head = this.state;
        if (!state_head)
          break;

        // Update durations on game states
        //
        for (let state = state_head; state; state = state.prev) {
          state.ticks    = this.tick_num - state.push_tick;
          state.duration = time - state.push_time;
        }

        state_head.onTick(this.tick_num);
      } while (state_head !== game.state);
    }

    // Draw
    //
    if (this.state) {
      this.ctx.imageSmoothingEnabled = false;
      this.state.onDraw(this.tick_num, time);
    }
  }

  pushState (state) {
    if (!state) {
      throw "Cannot push falsy state";
    }

    state.game = this;
    state.prev = this.state;
    state.next = null;

    state.push_tick = this.tick_num;
    state.push_time = this.tick_time;
    state.duration  = 0;
    state.tick      = 0;

    if (this.state) this.state.next = state;
    this.state = state;

    state.onPush();
  }

  popState () {
    const state = this.state;
    const replace = state.replace;

    this.state = state.prev;
    if (this.state) this.state.next = null;

    if (replace) {
      state.replace = null;
      this.pushState(replace);
    }

    state.onPop();
    return state;
  }

  enqueueState (state) {
    if (this.enqueue_head) {
      this.enqueue_head.prev = state;
    }

    state.next = this.enqueue_head;
    state.prev = null;
    this.enqueue_head = state;
  }
};

const game = window.game = new Game();
export default game;
