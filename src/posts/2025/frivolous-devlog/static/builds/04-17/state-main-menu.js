import game from "./game.js";
import { State, ElementState, CanvasLayerState } from "./state.js";
import { initAssets } from "./assets.js";
import { drawBar, makeFullscreenButton } from "./utils.js";

import GamemasterState from './state-gamemaster.js';

class MainMenuState extends ElementState {
  constructor (obj={}) {
    super({
      ...obj,
      element: {
        tag: "section",
        classes: "main-menu layer menu",

        style: {
          display:       "flex",
          flexDirection: "column",
          color:         "white",
        },

        children: [
          { tag: "div",
            style: {
              fontSize: "1.5em",
              height:   "100%",

              textAlign:     "center",
              display:       "flex",
              gap:           "0.18em",
              flexDirection: "column",

              maxWidth: "350px",
              margin:   "0 auto",
              padding:  "1em",
            },

            children: [
              { tag:     "h1",
                display: "block",
                text:    "Gill's Untitled Auto-Shooter Dungeon Game",
                style:   { color: "white" },
              },

              { tag:     "button",
                text:    "Start",
                classes: "start",
                style: { fontSize: "inherit", }
              },

              { tag: "footer",
                style: {
                  fontSize: "0.8rem",
                  marginTop: "auto",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4em",
                },

                children: [
                  { tag: "p",
                    style: { marginBottom: "0.5em", fontSize: "1.2em" },
                    innerHTML: `Created by <a target="_blank" href="https://gilchrist.tech/">Gilchrist Pitts</a>`
                  },
                  { tag: "p",
                    innerHTML: `Uses <a target="_blank" href="https://sethbb.itch.io/32rogues">32rogues</a> sprite pack by Seth`
                  },
                  { tag: "p",
                    text: "All rights reserved."
                  },
                ],
              },
            ],
          },

          makeFullscreenButton({
            style: {
              position: "absolute",
              bottom: "1em",
              right: "1em",
            },
          }),
        ],
      },
    });

    this.element.querySelector("button.start").addEventListener("click", (e) => {
      this.onStart();
    });
  }

  onPush () {
    super.onPush();
    // Ensure that assets have started to load when this state is pushed.
    initAssets();
  }

  onDraw () {
    this.element.hidden = false;
  }

  onStart () {
    const [ have, expect, ratio ] = initAssets();
    this.element.hidden = true;

    const gamemaster = new GamemasterState();

    if (have >= expect) {
      game.pushState(gamemaster);

    } else {
      game.pushState( new State({
        name: "LoadingState",

        replace: gamemaster,

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
    }
  }
}

export default MainMenuState;
