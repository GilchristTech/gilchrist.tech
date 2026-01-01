import game from "./game.js";
import { State, ElementState, CanvasLayerState } from "./state.js";
import { initAssets } from "./assets.js";
import { drawBar } from "./utils.js";

import CharacterSelectState from './state-character-select.js';


game.init();

game.pushState(new CanvasLayerState());

game.pushState( new State({
  name: "LoadingState",

  replace: new CharacterSelectState(),

  onTick: function (state, tick) {
    const [ have, expect, ratio ] = initAssets();
    if (have >= expect) {
      this.pop();
    }
  },

  onDraw: function (state, tick, time) {
    // Draw the loading bar
    const [ have, expect, ratio ] = initAssets();
    drawBar(this.ctx, ratio, 64, this.canvas.height/2-32, this.canvas.width-128, 64);
  },
}));


function animationFrameLoopCycle (time) {
  game.onAnimationFrame(time);
  window.requestAnimationFrame(animationFrameLoopCycle);
}
window.requestAnimationFrame(animationFrameLoopCycle);
