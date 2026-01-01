/*
  Global game data container, initialization, some event processing.
*/


export class Game {
  constructor () {
    this.ctx = null;
    this.player = null;

    this.frame_time = null;

    this.tick_num      = 0;
    this.tick_time     = 0;
    this.tick_duration = 1000/60;

    this.w = null;
    this.h = null;

    this.keys = {};

    this.pointer_on = false;
    this.pointer_x  = null;
    this.pointer_y  = null;
    this.pointer_dx = null;
    this.pointer_dy = null;
    this.pointer_down_x  = null;
    this.pointer_down_y  = null;

    this.__initialized = false;

    this.state = null;
    this.states_locked = false;
  }

  init () {
    //
    // Keyboard events
    //

    window.addEventListener("keyup",   (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener("keydown", (e) => {
      this.keys[e.code] ||= e;
      if (this.state)
        this.state.onKeyDown(e);
    });

    //
    // Mouse/Pointer events
    //

    window.addEventListener("click", (e) => {
      // Only pass click events on layer elements to states.
      if (!e.srcElement.classList.contains("layer")) {
        return;
      }

      const click_duration = e.timeStamp - (this.pointer_down_time || e.timeStamp);

      if (click_duration < 300) {
        this.click_x = this.pointer_x = e.screenX;
        this.click_y = this.pointer_y = e.screenY;

        this.state.onClick(e);
      }

      this.pointer_down_time = null;
      this.pointer_down_tick = null;
    });

    window.addEventListener("touchend",   (e) => this.onPointerUp(e));
    window.addEventListener("touchstart", (e) => this.onPointerDown(e));
    window.addEventListener("touchmove",  (e) => this.onPointerMove(e));

    window.addEventListener("pointerup",   (e) => this.onPointerUp(e));
    window.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    window.addEventListener("pointermove", (e) => this.onPointerMove(e));

    //
    // Gamepad
    //
    this.gamepad_index = null;

    window.addEventListener("gamepadconnected", (e) => {
      if (this.gamepad_index === null)
        this.gamepad_index = e.gamepad.index;
    });

    window.addEventListener("gamepaddisconnected", (e) => {
      if (e.gamepad.index === this.gamepad_index)
        this.gamepadIndex = null;
    });
  }

  onPointerUp (e) {
    this.pointer_on = false;
    this.pointer_dx = null;
    this.pointer_dy = null;
    this.pointer_down_x = null;
    this.pointer_down_y = null;

    if (this.state)
      this.state.onPointerUp(e);
  }

  onPointerDown(e) {
    const x = e.screenX ?? e.targetTouches?.[0].screenX;
    const y = e.screenY ?? e.targetTouches?.[0].screenY;

    this.pointer_on = true;
    this.pointer_down_x = x;
    this.pointer_down_y = y;
    this.pointer_dx = 0;
    this.pointer_dy = 0;
    this.pointer_down_time = e.timeStamp;
    this.pointer_down_tick = this.tick_num;
    if (this.state)
      this.state.onPointerDown(e);
  }

  onPointerMove (e) {
    const x = e.screenX ?? e.targetTouches?.[0].screenX;
    const y = e.screenY ?? e.targetTouches?.[0].screenY;

    this.pointer_x  = x;
    this.pointer_y  = y;

    if (this.pointer_on) {
      this.pointer_dx = x - this.pointer_down_x;
      this.pointer_dy = y - this.pointer_down_y;
    }

    if (this.state)
      this.state.onPointerMove(e);
  }

  onAnimationFrame (time) {
    if (!document.hasFocus())
      this.keys = {};

    this.frame_time = time;

    // Run ticks until the tick time catches up with the current timestamp.

    while (this.tick_time <= time) {
      let state_head;

      // Run the game state onTick once, then re-run every time
      // it changes. This ensures all onTick events which modify
      // the game state will have the new state's onTick method
      // ran prior to drawing. There is a potential ABA problem
      // here to be wary of when modifying the state stack, so
      // too much cleverness in its use is best avoided.
      //
      do {
        // Enqueue states from the enqueue stack until there are none left.
        while (this.enqueue_head) {
          const pushed_state = this.enqueue_head;
          const new_head = pushed_state.next;
          if (new_head)
            new_head.prev = null;
          this.enqueue_head = new_head;
          this.pushState(pushed_state);
        }

        state_head = this.state;
        if (!state_head)
          break;

        // Update durations on game states and execute pre-tick
        // handlers.
        //
        for (let state = state_head; state; state = state.prev) {
          // Only update this state once per tick cycle, because
          // updating the pretick times sets a state's
          // pretick_tick to this.tick_num

          if (state.pretick_tick === this.tick_num) {
            continue;
          }

          state.pretickUpdateTimes(this.tick_num, time);
          state.onPretick(this.tick_num, time);
        }

        state_head.onTick(this.tick_num);
      } while (state_head !== game.state);

      this.tick_num++;
      this.tick_time += this.tick_duration;
    }

    // Draw
    //
    if (this.state) {
      this.state.onDraw(this.tick_num, time);
    }
  }

  pushState (state) {
    if (!state) {
      throw "Cannot push falsy state";
    }

    if (this.states_locked) {
      throw "Cannot push state, states are locked";
    }

    state.game = this;
    state.prev = this.state;
    state.next = null;

    // Forward element properties - states take place in the
    // elements and canvases of their previous states. States in
    // the stack can change the element of future states by
    // changing their element tag. ElementStates do this
    // automatically.
    //
    if (state.prev) {
      if (!state.element) state.element = state.prev.element;
      if (!state.canvas ) state.canvas  = state.prev.canvas;
      if (!state.ctx    ) state.ctx     = state.prev.ctx;
    }

    state.push_tick = this.tick_num;
    state.push_time = this.tick_time;
    state.duration  = 0;
    state.tick      = 0;

    if (this.state) this.state.next = state;
    this.state = state;

    state.onPush();
    return state;
  }

  popState (surpass_lock=false) {
    if (!surpass_lock && this.states_locked) {
      throw "Cannot pop state, states are locked";
    }

    const state = this.state;
    const replace = state.__replace;

    this.state = state.prev;
    if (this.state) this.state.next = null;

    if (replace) {
      state.__replace = null;
      this.pushState(replace);
    }

    state.onPop();
    return state;
  }

  lockStates () {
    if (this.states_locked)
      throw "States are already locked";

    this.states_locked = true;
  }

  unlockStates () {
    if (! this.states_locked) {
      throw "States are not locked";
    }

    this.states_locked = false;
  }

  tryLockStates () {
    if (this.states_locked) {
      return false;
    }

    this.states_locked = true;
    return true;
  }

  enqueueState (state, surpass_lock=false) {
    if (!surpass_lock && this.states_locked) {
      throw "Cannot enqueue state, states are locked";
    }

    if (this.enqueue_head) {
      this.enqueue_head.prev = state;
    }

    state.next = this.enqueue_head;
    state.prev = null;
    this.enqueue_head = state;
  }

  toggleFullscreen () {
    toggleFullscreen();
  }
};


export function toggleFullscreen () {
  if (document.fullscreen) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
}


const game = window.game = new Game();
export default game;
