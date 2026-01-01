import game from "./game.js";
import { CanvasLayerState } from "./state.js";

import MainMenuState from './state-main-menu.js';


game.init();

game.pushState(new CanvasLayerState());
game.pushState(new MainMenuState());

document.addEventListener("keypress", (e) => {
  if (e.code == "KeyF") {
    game.toggleFullscreen();
  }
});

function animationFrameLoopCycle (time) {
  game.onAnimationFrame(time);
  window.requestAnimationFrame(animationFrameLoopCycle);
}
window.requestAnimationFrame(animationFrameLoopCycle);

window.debug = localStorage.getItem("debug");
window.debug = window.debug && window.debug != "false";

if (window.debug) {
  window.Debug = await import("./debug.js");
}
