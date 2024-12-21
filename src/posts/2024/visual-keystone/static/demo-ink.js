const img_url = new URL("./demo-img.webp", import.meta.url);

const template = document.createElement('template');
template.innerHTML = (`
  <style>
    *, *::before, *::after { box-sizing: border-box; }

    :host {
      background: #f7f7f7;
      padding: 1em;

      display: grid;
      grid-template-columns: 0.85fr 18px 1fr;
      grid-gap: 2px;

      font-family: sans-serif;
      user-select: none;

      border: 4px groove #ddd;
    }

    :host > * {
      box-shadow:
        1px 1px 2px #0004,
        1px 1px 1px #8888;
    }

    #color {
      position: relative;
      background: #f00;
      cursor: crosshair;
      cursor: cell;
    }

    #saturation-lightness {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(to top,   #000f, #0000),
        linear-gradient(to right, #ffff, #fff0);
      z-index: 1;
    }

    #hue {
      position: relative;
      background: linear-gradient(to bottom, red, yellow, lime, cyan, blue, magenta, red);
      cursor: grab;
    }

    .selector {
      position: absolute;
      border: 2px solid #888;
      pointer-events: none;
      z-index: 2;
    }

    #color > .selector {
      width:   16px;
      top:     -8px;
      left:    -8px;
      height:  16px;
      background: blue;
      border-radius: 50%;
      background: #fff;
    }

    #hue > .selector {
      position: absolute;
      top:   -6px;
      left:  -3px;
      right: -3px;
      background: #f00;

      height: 12px;
      border-radius: 4px;
    }

    #ink-background {
      padding: 8px;
      background: white;
      margin-left: 8px;
    }

    img {
      display: block;
      max-width: 100%;
      max-height: 300px;
      margin: 0 auto;
      border: 1px dashed #888;
    }

    /*
      The ink class is for high-contrast greyscale images with no
      transparency, indented for ink illustrations.

      On a white background. The image will adopt the background as
      though the white were transparent, and black pixels will be
      the inverse of the background. This allows suitable images to
      work in any color scheme.

      If not all the necessary CSS is supported, it doesn't try
      anything fancy, falling back to boring, normally-styled
      elements instead.
    */
    @supports ((filter: invert()) and (mix-blend-mode: difference)) {
      img.ink {
        filter: invert();
        mix-blend-mode: difference;
      }
    }
  </style>

  <div id="color">
    <div id="saturation-lightness"></div>
    <div id="color-selector" class="selector"></div>
  </div>
  <div id="hue">
    <div id="hue-selector" class="selector"></div>
  </div>
  <div id="ink-background">
    <img class="ink" src="${img_url}">
  </div>
`);


class InkDemo extends HTMLElement {
  connectedCallback () {
    const shadow = this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(
        template.content.cloneNode(true)
      );

    this.hue        =   0;
    this.saturation = 100;
    this.lightness  =  50;

    this.color_pane      = shadow.children.color;
    this.hue_pane        = shadow.children.hue;
    this.color_selector  = this.color_pane.children["color-selector"];
    this.hue_selector    = this.hue_pane.children["hue-selector"];
    this.ink_background  = shadow.children["ink-background"];

    let color_pane_mouse_is_down = false;
    let   hue_pane_mouse_is_down = false;

    // Color pane mouse events

    this.color_pane.addEventListener("mousedown", (e) => {
      color_pane_mouse_is_down = true;
      this.setColorSelectorCursor(...this.getColorPaneMouse(e));
    });

    window.addEventListener("mousemove", (e) => {
      if (!color_pane_mouse_is_down)
        return;
      this.setColorSelectorCursor(...this.getColorPaneMouse(e));
    });

    // Color pane mouse events

    this.hue_pane.addEventListener("mousedown", (e) => {
      hue_pane_mouse_is_down = true;
      this.hue_pane.style.cursor = "grabbing";
      this.setHueSelectorCursor(this.getHuePaneMouse(e));
    });

    window.addEventListener("mousemove", (e) => {
      if (!hue_pane_mouse_is_down)
        return;
      this.setHueSelectorCursor(this.getHuePaneMouse(e));
    });

    window.addEventListener("mouseup", (e) => {
      if (color_pane_mouse_is_down) {
        this.setColorSelectorCursor(...this.getColorPaneMouse(e));
        color_pane_mouse_is_down = false;
      }
      if (hue_pane_mouse_is_down) {
        this.setHueSelectorCursor(this.getHuePaneMouse(e));
        this.hue_pane.style.cursor = "grab";
        hue_pane_mouse_is_down = false;
      }
    });
  }

  getColorPaneMouse (event) {
    const pane_rect = this.color_pane.getClientRects()[0];
    let x = event.clientX - pane_rect.x;
    let y = event.clientY - pane_rect.y;
    x = (x < 0) ? 0 : x;
    y = (y < 0) ? 0 : y;
    x = (x > pane_rect.width ) ? pane_rect.width : x;
    y = (y > pane_rect.height) ? pane_rect.height : y;
    return [x, y];
  }

  getHuePaneMouse (event) {
    const pane_rect = this.hue_pane.getClientRects()[0];
    let y = event.clientY - pane_rect.y;
    y = (y < 0) ? 0 : y;
    y = (y > pane_rect.bottom) ? height : y;
    return y;
  }

  setColorSelectorCursor (local_x, local_y) {
    this.color_selector.style.left = local_x - 8 + "px";
    this.color_selector.style.top  = local_y - 8 + "px";

    const pane_rect = this.color_pane.getClientRects()[0];
    const width  = pane_rect.width;
    const height = pane_rect.height;

    const ratio_x = local_x / width;
    const ratio_y = (height-local_y) / height;

    const saturation = ratio_x;
    const lightness  = (1 - ratio_x/2) * ratio_y;
    this.updateColor(saturation * 100, lightness * 100);
  }

  setHueSelectorCursor (y) {
    this.hue_selector.style.top = y - 6 + "px";
    const pane_rect = this.hue_pane.getClientRects()[0];
    this.updateHue((y/pane_rect.height) * 360);
    this.updateColor();
  }

  updateHue (hue) {
    if (arguments.length > 0) {
      this.hue = hue;
    }
    const color = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
    const hue_color = `hsl(${this.hue}, 100%, 50%)`;
    this.color_pane.style.background     = hue_color;
    this.hue_selector.style.background   = hue_color;
    this.color_selector.style.background = color;
  }

  updateColor (saturation, lightness) {
    if (arguments.length == 0) {
      saturation = this.saturation;
      lightness  = this.lightness;
    } else if (arguments.length == 2) {
      this.saturation = saturation;
      this.lightness  = lightness;
    } else {
      throw TypeError(`Incorrect number of arguments: ${arguments.length}`);
    }

    const color = `hsl(${this.hue}, ${saturation}%, ${lightness}%)`;
    this.color_selector.style.background = color;
    this.ink_background.style.background = color;
  }
}

customElements.define("ink-demo", InkDemo);
