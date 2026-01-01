export class State {
  constructor (obj={}) {
    this.name = obj.name || "state";

    this.game    = null;
    this.prev    = null;
    this.next    = null;
    this.replace = obj.replace || null;

    this.ticks     = null;
    this.duration  = null;
    this.push_tick = null;
    this.push_time = null;

    this.__init      = obj.init      || null;
    this.__onTick    = obj.onTick    || null;
    this.__onDraw    = obj.onDraw    || null;
    this.__onPush    = obj.onPush    || null;
    this.__onKeyDown = obj.onKeyDown || null;
    this.__onKeyUp   = obj.onKeyUp   || null;

    this.init(obj);
  }

  init (obj) {
    if (this.__init)
      this.__init(this, obj)
  }

  onKeyDown (e)              { if (this.__onKeyDown) this.__onKeyDown(this, e)           }
  onKeyUp   (e)              { if (this.__onKeyUp)   this.__onKeyUp(this, e)             }
  onPush    ()               { if (this.__onPush)    this.__onPush(this)                 }
  onTick    (tick_num)       { if (this.__onTick)    this.__onTick(this, tick_num)       }
  onDraw    (tick_num, time) { if (this.__onDraw)    this.__onDraw(this, tick_num, time) }
  onPop     ()               { if (this.__onPop)     this.__onPop(this)                  }

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

export default State;
