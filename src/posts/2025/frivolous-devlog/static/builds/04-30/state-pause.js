import { ElementState } from "./state.js";
import { makeElement, makeFullscreenButton } from "./utils.js";
import { MapState } from "./state-map.js";

class PauseState extends ElementState {
  constructor (obj={}) {
    super({...obj, element: {
      tag:     "section",
      classes: "pause-screen layer dim menu",

      style: {
        padding: "1rem",
      },

      children: [
        { tag: "nav",

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
              tag: "h2",
              text: "Paused",
              style: { display: "block", width: "100%", border: "none" },
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

    this.title = obj.title || null;

    if (this.title) {
      this.element.querySelector("nav").prepend(
        makeElement({
          tag: "h1", text: this.title,
          style: {
            fontSize: "3em",
            borderBottom: "6px double white",
            margin: "0",
          },
        })
      );
    }

    this.quit_until = obj.quit_until ?? null;

    this.element.querySelector("button.continue").addEventListener("click", (e) => {
      this.pop();
    });

    this.element.querySelector("button.quit").addEventListener("click", (e) => {
      this.onQuit();
    });

    if (window.debug) {
      const nav = this.element.querySelector("nav");
      nav.appendChild(makeElement({
        tag:  "button",
        text: "Win Level",
        onClick: (e) => {
          const map_state = this.findStateInstanceOf(MapState);
          map_state.setResult("win");
          this.pop();
        },
      }));
    }
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
    const passthrough = this.passthrough;
    this.passthrough = false;
    super.onDraw(tick, time);
    this.passthrough = passthrough;;

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
