import { ElementState } from "./state.js";
import { makeFullscreenButton } from "./utils.js";

class PauseState extends ElementState {
  constructor (obj={}) {
    super({...obj, element: {
      tag:     "section",
      classes: "pause-screen layer dim menu",

      style: {
        padding: "1rem",
      },

      children: [
        { tag: "div",

          style: {
            maxWidth:      "300px",
            margin:        "10% auto",
            display:       "flex",
            flexDirection: "column",
            gap:           "1em",
            fontSize:      "1.25em",
          },

          children: [
            {
              tag: "h1",
              text: "Paused",
              style: { display: "block", width: "100%" },
            },
            { tag: "button", text: "Continue", classes: "continue" },
            { tag: "button", text:     "Quit", classes:     "quit" },
          ]
        },

        makeFullscreenButton({
          style: {
            position: "absolute",
            bottom: "1em",
            right: "1em",
          },
        }),
      ],
    }});

    this.quit_until = obj.quit_until ?? null;

    this.element.querySelector("button.continue").addEventListener("click", (e) => {
      this.pop();
    });

    this.element.querySelector("button.quit").addEventListener("click", (e) => {
      this.onQuit();
    });
  }

  onKeyDown (e) {
    switch (e.code) {
      case "Backspace":
      case "Escape":
        this.pop();
        return;
    }
  }

  onDraw (tick, time) {
    // Passthrough of draw events, but in slow motion
    this.prev && this.prev.onDraw(tick/4, time/4);
  }

  onQuit () {
    if (! this.quit_until) {
      this.pop();
      return;
    }

    this.popUntilState(this.quit_until);
  }
}

export default PauseState;
