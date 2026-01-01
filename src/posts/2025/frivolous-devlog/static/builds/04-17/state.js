import { makeElement } from "./utils.js";

export class State {
  constructor (obj={}) {
    this.name = obj.name || "state";

    this.game    = null;
    this.prev    = null;
    this.next    = null;
    this.element = null;
    this.canvas  = null;
    this.ctx     = null;
    this.__replace = obj.replace || null;

    this.duration  = null;
    this.push_tick = null;
    this.push_time = null;

    // If true, by default this state will pass its events to the
    // previous state, unless a class method overrides this
    // behavior.
    this.passthrough = obj.passthrough ?? false;

    this.__init      = obj.init      || null;
    this.__onTick    = obj.onTick    || null;
    this.__onPretick = obj.onPretick || null;
    this.__onDraw    = obj.onDraw    || null;
    this.__onPush    = obj.onPush    || null;
    this.__onKeyDown = obj.onKeyDown || null;
    this.__onKeyUp   = obj.onKeyUp   || null;
    this.__onClick   = obj.onClick   || null;

    this.__onPointerUp   = obj.onPointerUp   || null;
    this.__onPointerDown = obj.onPointerDown || null;
    this.__onPointerMove = obj.onPointerMove || null;

    this.parent = null;
    this.substates    = null;

    if (obj.initialize === undefined || obj.initialize) {
      this.init(obj);
    }
  }

  init (obj) {
    if (this.__init) {
      this.__init(this, obj)
    }
  }

  onKeyDown (e) {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onKeyDown(e);
    }

    if (this.passthrough) this.prev && this.prev.onKeyDown(e);
    if (this.__onKeyDown) this.__onKeyDown(this, e);
  }

  onKeyUp (e) {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onKeyUp(e);
    }

    if (this.passthrough) this.prev && this.prev.onKeyUp(e);
    if (this.__onKeyUp)   this.__onKeyUp(this, e);
  }

  onClick (e) {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onClick(e);
    }

    if (this.passthrough) this.prev && this.prev.onClick(e);
    if (this.__onClick)   this.__onClick(this, e);
  }

  onPush () {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onPush();
    }

    if (this.__onPush) this.__onPush(this);
  }

  onTick (tick_num) {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onTick(tick_num);
    }

    if (this.passthrough) this.prev && this.prev.onTick(tick_num);
    if (this.__onTick)    this.__onTick(this, tick_num);
  }

  onPretick (tick_num, time) {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onPretick(tick_num, time);
    }

    if (this.passthrough) this.prev && this.prev.onPretick(tick_num, time);
    if (this.__onPretick) this.__onPretick(this, tick_num);
  }

  onDraw (tick_num, time) {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onDraw(tick_num, time);
    }

    if (this.passthrough) this.prev && this.prev.onDraw(tick_num, time);
    if (this.__onDraw)    this.__onDraw(this, tick_num, time);
  }

  onPop () {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onPop();
    }

    if (this.__onPop) this.__onPop(this);
  }

  onPointerMove (e) {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onPointerMove(e);
    }

    if (this.passthrough)     this.prev && this.prev.onPointerMove(e);
    if (this.__onPointerMove) this.__onPointerMove(this, e);
  }

  onPointerDown (e) {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onPointerDown(e);
    }

    if (this.passthrough)     this.prev && this.prev.onPointerDown(e);
    if (this.__onPointerDown) this.__onPointerDown(this, e);
  }

  onPointerUp (e) {
    for (let substate=this.substate; substate; substate=substate.prev) {
      substate.onPointerUp(e);
    }

    if (this.passthrough)   this.prev && this.prev.onPointerUp(e);
    if (this.__onPointerUp) this.__onPointerUp(this, e)
  }

  replace (new_state, surpass_lock) {
    if (!surpass_lock && this.game && this.game.states_locked) {
      throw "Cannot replace states, game states are locked";
    }

    this.onPop();

    new_state.prev = this.prev;

    if (this.prev) {
      this.prev.next = new_state;
    }

    if (this.game.state === this) {
      this.game.state = new_state;
    } else {
      if (this.next) {
        this.next.prev = new_state;
      }
      new_state.next = this.next;
    }

    this.prev = null;
    this.next = null;
    this.game = null;
  }

  pop (surpass_lock=false) {
    if (this.game) {
      if (this.game.state === this) {
        return this.game.popState(surpass_lock);
      }

      if (!surpass_lock && this.game.states_locked) {
        throw "Cannot pop state, game states are locked";
      }
    }

    if (this.parent?.substate === this) {
      return this.parent.popSubstate();
    }

    this.onPop();

    if (this.prev) {
      this.prev.next = this.next;
    }

    if (this.next) {
      this.next.prev = new_state;
    }

    this.prev = null;
    this.next = null;
    this.game = null;
    this.parent = null;
  }

  popUntilState (until_state) {
    let state = this.prev;
    let num_pop = 1;
    let found_until = false;

    while (state) {
      num_pop++;

      if (state === until_state) {
        found_until = true;
        break;
      }

      state = state.prev;
    }

    if (found_until == false) {
      this.pop();
      return;
    }

    this.game.lockStates();
    for (
      let state=this, num_popped=0;
      state && num_popped < num_pop;
      num_popped++
    ){
      const prev = state.prev;
      state.pop(true);
      state = prev;
    }
    this.game.unlockStates();
  }

  findStateInstanceOf (cls) {
    for (let state=this.prev; state; state = state.prev) {
      if (state instanceof cls) {
        return state;
      }
    }
    return null;
  }

  pushSubstate (substate) {
    if (substate.parent) {
      throw "Substate already has a parent";
    }

    substate.game = this.game;

    substate.parent = this;
    substate.prev         = this.substate;
    if (this.substate) {
      this.substate.next   = substate;
    }
    this.substate         = substate;

    // Substate inherits these properties
    substate.element = this.element;
    substate.canvas  = this.canvas;
    substate.ctx     = this.ctx;

    substate.onPush();
  }

  popSubstate () {
    const substate = this.substate;

    if (!substate) {
      throw "Cannot pop substate, state has no substates";
    }

    substate.onPop();

    const prev = substate.prev;

    if (prev) {
      prev.next = null;
    }

    this.substate = prev || null;;

    substate.game   = null;
    substate.parent = null;
    substate.prev   = null;
    substate.next   = null;
  }

  pretickUpdateTimes (tick, time) {
    this.duration     = time - this.push_time;
    this.pretick_tick = tick;

    for (let substate=this.substate; substate; substate = substate.prev) {
      substate.pretickUpdateTimes(tick, time);
    }
  }
}


export class ElementState extends State {
  constructor (obj={}) {
    super({...obj, initialize: false});

    let element = obj.element;

    if (! element) {
      const tag     = obj.tag     || "div";
      const classes = obj.classes || null;
      const id      = obj.id      || null;

      element = document.createElement(tag);
      if (id)      element.id        = id;
      if (classes) element.classList = classes;

    } else if (! (element instanceof HTMLElement)) {
      element = makeElement(element);
    }

    if (Array.isArray(element)) {
      const wrapper = document.createElement("div");
      for (let child of element) {
        wrapper.appendChild(child);
      }
      element = wrapper;
    }

    if (element.tagName == "CANVAS") {
      this.canvas = element;
      this.ctx    = element.getContext("2d");
    } else {
      this.canvas = null;
      this.ctx    = null;
    }

    this.element = element;

    this.tick_remove = obj.tick_remove || false;

    if (obj.initialize !== undefined && obj.initialize)
      this.init(obj);
  }

  onPush () {
    let parent_element = this.parent_element || document.body;
    if (typeof parent_element === "string") {
      parent_element = document.querySelector(parent_element);
      if (!parent_element) {
        throw "Could not find parent_element";
      }
    }

    parent_element.appendChild(this.element);
    if (this.__onPush)
      this.__onPush(this);
  }

  onPop () {
    this.element.remove();
    if (this.__onPop)
      this.__onPop(this);
  }

  onTick (tick) {
    if (this.passthrough)
      this.prev && this.prev.onTick(tick);

    if (this.tick_remove) {
      this.pop();
    }
  }
}


export class CanvasLayerState extends ElementState {
  constructor (obj={}) {
    super({
      ...obj,
      tag: "canvas",
      tick_remove: obj.tick_remove ?? true,
    });

    this.element.classList.add("layer");
  }

  onPretick (tick, time) {
    if (this.passthrough)
      this.prev && this.prev.onPretick(tick, time);
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false;
  }
}

export default State;
