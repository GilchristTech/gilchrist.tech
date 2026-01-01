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

    if (obj.initialize === undefined || obj.initialize) {
      this.init(obj);
    }
  }

  init (obj) {
    if (this.__init)
      this.__init(this, obj)
  }

  onKeyDown (e)              { if (this.__onKeyDown) this.__onKeyDown(this, e)           }
  onKeyUp   (e)              { if (this.__onKeyUp)   this.__onKeyUp(this, e)             }
  onClick   (e)              { if (this.__onClick)   this.__onClick(this, e)             }
  onPush    ()               { if (this.__onPush)    this.__onPush(this)                 }
  onTick    (tick_num)       { if (this.__onTick)    this.__onTick(this, tick_num)       }
  onPretick (tick_num, time) { if (this.__onPretick) this.__onPretick(this, tick_num)    }
  onDraw    (tick_num, time) { if (this.__onDraw)    this.__onDraw(this, tick_num, time) }
  onPop     ()               { if (this.__onPop)     this.__onPop(this)                  }

  onPointerMove (e) { if (this.__onPointerMove) this.__onPointerMove(this, e) }
  onPointerDown (e) { if (this.__onPointerDown) this.__onPointerDown(this, e) }
  onPointerUp   (e) { if (this.__onPointerUp)   this.__onPointerUp(this, e)   }

  replace (new_state) {
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

  pop () {
    if (this.game.state === this) {
      this.game.popState();
      return;
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
  }
}


export class ElementState extends State {
  constructor (obj={}) {
    super({...obj, initialize: false});

    if (obj.element) {
      this.element = obj.element;
      return;
    }

    const tag     = obj.tag     || "div";
    const classes = obj.classes || null;
    const id      = obj.id      || null;

    const element = document.createElement(tag);
    if (id)      element.id        = id;
    if (classes) element.classList = classes;

    this.element = element;

    if (element.tagName == "CANVAS") {
      this.canvas = element;
      this.ctx    = element.getContext("2d");
    } else {
      this.canvas = null;
      this.ctx    = null;
    }

    this.tick_remove = obj.tick_remove || false;

    if (obj.initialize !== undefined && obj.initialize)
      this.init(obj);
  }

  onPush () {
    let parent = this.parent || document.documentElement;
    if (typeof parent === "string") {
      parent = document.querySelector(parent);
      if (!parent) {
        throw "Could not find parent";
      }
    }

    parent.appendChild(this.element);
    if (this.__onPush)
      this.__onPush(this);
  }

  onPop () {
    this.element.remove();
    if (this.__onPop)
      this.__onPop(this);
  }

  onTick (tick) {
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
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false;
  }
}

export default State;
