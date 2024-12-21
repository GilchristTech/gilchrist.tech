const img_url = new URL("./demo-img.webp", import.meta.url);

const template = document.createElement("template");

template.innerHTML = `<style>
  *, *::before, *::after { box-sizing: inherit }

  :host {
    display: block;
    user-select: none;
    font-family: sans-serif;
    box-sizing: border-box;
    background: teal;

    padding: 8px;
    padding-bottom: 0;
  }

  .window-decoration {
    margin: 0 auto;
    padding: 8px;
    display: grid;

    grid-template-columns: 100%;
    grid-template-rows: auto auto 1fr;
    gap: 2px;
    
    height:     250px;
    min-width:  175px;
    min-height: 300px;
    max-width:  100% ;

    background: #ddd;
    border: 2px outset #ccc;
    resize: both;
    overflow: hidden;
    box-shadow: 3px 3px #0004;
    transition-timing-function: linear !important;
  }

  header.title-bar {
    height:      2em;
    line-height: 2em;

    margin: -8px;
    margin-bottom: 4px;
    padding: 2px;
    padding-left: 8px;

    background: linear-gradient(to right, #008f, #0082);
    color: white;
    font-size: 0.9em;

    display: flex;
    justify-content: space-between;
    gap: 2em;

    span {
      display: block;
      text-overflow: ellipsis;
      word-break: break-all;
      overflow:hidden;
      white-space: nowrap;
    }

    nav {
      display: flex;
    }

    button {
      display: block;
      padding: 0;
      margin:  0;

      width:       1.5em;
      height:      1.5em;
      line-height: 1.5em;
      font-weight: bold;

      text-shadow: 1px 1px 0px #444;
      box-sizing:  content-box;
    }
  }

  header.url-bar {
    color: black;
    background: white;

    margin-bottom: 4px;

    padding: 4px;
    font-size: 0.5em;
    line-height: 0;
    border: 1px solid #888;
    border-radius: 1px;
    font-family: monospace;
    font-size: 0.8em;
    overflow: hidden;
  }

  .window-content {
    border: 1px solid #888;

    container: view-container / size;
    overflow: scroll;

    background: white;

    font-size: 8px;
    padding: 1em;
    border-radius: 2px;
  }

  .vertical-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    max-width: 23rem;
    margin: 0 auto;
  }

  h1, h2 {
    border-bottom: 0.125em solid #888;
  }

  :host > div > * {
    grid-column: 1;
  }

  .vertical-split > img {
    margin: 0 auto;
    grid-column: 2;
    grid-row: 1 / span 999;

    width: 100%;
    height: 100cqh;
    object-position: center;
    object-fit: contain;

    position: sticky;
    top: 0;
  }

  footer {
    background: #ddd;
    margin: 8px -8px;
    margin-bottom: 0;
    padding: 2px;
  }

  button,
  input[type="radio"] + label {
    border: 2px outset #ddd;
    padding: 2px;
  }

  input[type="radio"] {
    display: none;
  }

  button:focus ,
  input[type="radio"]:checked + label {
    background: #eee;
    border-style: inset;
  }

  @container view-container (max-width: 200px){
    .vertical-split {
      display: block;
    }

    .vertical-split img {
      position: static;
      margin: 0 auto;
      max-width:  100%;
      max-height: 200px;
      max-height: 50cqh;
    }
  }
</style>

<div id="window-decoration" class="window-decoration">
  <header class="title-bar">
    <span>Demo Page</span>
    <nav>
      <button id="minimize">_&#xFE0E;</button>
      <button id="maximize">□&#xFE0E;</button>
      <button id="close"   >✕&#xFE0E;</button>
    </nav>
  </header>
  <header class="url-bar">
    <p>https://example.com/page</p>
  </header>

  <div class="window-content">
    <div class="vertical-split">

      <h1>Heading</h1>
      <img class="ink" src="${img_url}">

      <p>Lorem sequi magni nulla voluptates dolorum Ullam fuga
      alias nam veniam fugiat. Facilis dolore facilis fugit
      corporis porro exercitationem? Ipsa eos assumenda esse culpa
      voluptate In magni itaque itaque adipisci natus rem. Odio
      delectus consequuntur impedit mollitia ipsum Quis dignissimos
      qui molestiae illum impedit. Explicabo temporibus temporibus
      inventore nostrum deleniti?</p>

      <p>Lorem sunt nobis eos maiores maxime Incidunt quidem
      nostrum numquam quisquam voluptate? Repellendus sit quos
      soluta enim possimus labore Quod odio aut provident
      laudantium dolorem.  Tenetur fugit quaerat quas perspiciatis
      inventore! Architecto aspernatur totam id consectetur fugit.
      Quisquam tempore ex commodi sapiente illum Adipisci vitae sit
      consequatur doloribus accusantium Sunt id quos tempore quam
      sapiente.  Saepe error quibusdam ut sit exercitationem
      inventore! Ex quidem consequuntur ducimus hic sit cupiditate
      Molestias ullam illum vel ut animi? Maxime reiciendis ipsa
      quis molestiae provident, voluptatibus Aut cumque odit
      adipisci commodi expedita perferendis. Vitae veniam illo
      debitis ea id.</p>

      <h2>Heading 2</h2>

      <p>Itaque dolore nemo iste iste molestiae. Atque ratione
      reprehenderit sequi quia voluptatem? Similique mollitia
      exercitationem veritatis impedit culpa? Quisquam vitae rem
      error ipsa dicta Fugiat vel molestiae quaerat ex consectetur
      dolores non, accusantium Esse dicta excepturi quo voluptatem
      eum? Repellendus autem aspernatur quibusdam error odit
      incidunt! Reiciendis iure et expedita architecto officia,
      quae! Earum at eveniet unde aliquam quas.  Repellendus
      doloremque fugiat voluptas perspiciatis delectus, quis!
      Officia eos eum esse amet omnis. Similique nobis labore
      officia incidunt quam id? Fugiat magnam sapiente quisquam
      quam eos. Laboriosam dolorem molestiae animi sequi
      dignissimos Eum reprehenderit odit ipsum iusto tenetur
      Excepturi impedit quo nam temporibus deleniti modi. Illum
      inventore cumque alias est nostrum veniam sed, et? Eius alias
      eaque architecto quam numquam, porro Porro dolorem
      consequuntur eligendi reprehenderit vero Consequatur quasi
      non ullam aliquid animi voluptate amet. Ducimus dolores quas
      dolores rem a.</p>

      <p>Doloribus repellat hic quibusdam aut perferendis
      temporibus suscipit. Esse iusto veritatis in quas explicabo!
      Facilis voluptatem ipsa nulla exercitationem dolorum? A
      voluptatem doloribus veritatis fugit dolorem Placeat sint
      magni illum rem magni iste alias temporibus. Vel odit
      pariatur itaque eligendi enim. Ad corrupti sequi mollitia
      delectus quia Repellat voluptatem harum nesciunt dignissimos
      cum Ea ullam impedit sapiente ipsum veritatis? Aut rem
      delectus distinctio sed architecto. Incidunt alias a esse non
      quis. Architecto accusantium iusto quae expedita quia.
      Quisquam doloremque ex adipisci excepturi mollitia. Ipsa
      doloremque placeat ex pariatur consequatur hic neque facilis?
      Harum voluptas qui quia ipsam eos Tempore aut iusto magni
      natus animi? Fuga est assumenda voluptatem eos doloremque
      Quidem illo modi obcaecati beatae optio. Tenetur ipsa
      excepturi ipsa asperiores facere? Debitis quaerat recusandae
      nam aliquid alias reiciendis laboriosam?</p>
    </div>
  </div>

</div>

<footer>
  <form>
    <input name="layout" id="layout-desktop" type="radio" value=Desktop>
    <label for="layout-desktop">Desktop</label>
    <input name="layout" id="layout-mobile"  type="radio" value=Mobile>
    <label for="layout-mobile">Mobile</label>
  </form>
</footer>
`;

class LayoutDemo extends HTMLElement {
  connectedCallback () {
    let supports_container_css = false;
    try {
      supports_container_css = CSS.supports("(container-type: size)");
    }
    catch {
      // pass
    }

    if (!supports_container_css) {
      this.innerHTML = `
        <div style="text-align: center; width: 100%; border: 3px double red; padding: 8%; text-wrap: balance">
          Sorry, this demo requires a browser with support for CSS container queries.
        </div>
      `;

      return;
    }

    const shadow = this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.maximized = true;
    this.animating = false;

    const window_decoration = shadow.getElementById("window-decoration");
    this.window_decoration = window_decoration;

    this.layout_desktop_radio = shadow.getElementById("layout-desktop");
    this.layout_mobile_radio  = shadow.getElementById("layout-mobile");

    this.window_decoration_max_width  = window_decoration.offsetWidth;
    this.window_decoration_max_height = window_decoration.offsetHeight;

    this.desktop_width = this.window_decoration_max_width;
    this.mobile_width  = 200;

    shadow.getElementById("minimize").addEventListener("click", function (e) {
      alert("Sorry, this isn't a real window!");
      e.target.blur();
    });

    shadow.getElementById("close").addEventListener("click", function (e) {
      alert("Sorry, this isn't a real window!");
      e.target.blur();
    });

    shadow.getElementById("maximize").addEventListener("click", async (e) => {
      const button = e.target;

      if (this.maximized) {
        await this.setLayoutMobile();
        this.layout_mobile_radio.checked = true;
      } else {
        await this.setLayoutDesktop();
        this.layout_desktop_radio.checked = true;
      }

      button.blur();
    });

    this.layout_desktop_radio.addEventListener("click", async (e) => {
      await this.setLayoutDesktop();
    });

    this.layout_mobile_radio.addEventListener("click", async (e) => {
      await this.setLayoutMobile();
    });

    // React when the demo's fake window is resized
    //
    new ResizeObserver(entries => {
      const window_width  = this.window_decoration.offsetWidth;
      const window_height = this.window_decoration.offsetWidth;

      this.maximized = (
        (window_width  >= this.window_decoration_max_width  - 8) &&
        (window_height >= this.window_decoration_max_height - 8)
      );

      if (this.animating)
        return;

      const entry = entries[0];

      this.layout_desktop_radio.checked = this.maximized;

      this.layout_mobile_radio.checked = (
        Math.abs(window_width - this.mobile_width) <= 8
      );
    }).observe(window_decoration);
  }

  async resizeWindowAnimated (width, height, duration=50) {
    this.animating = true;

    // Cancel an existing transition
    this.window_decoration.style.transition = null;

    const transition_promise = new Promise((resolve) => {
      this.window_decoration.addEventListener("transitionend", resolve, {once: true});
      setInterval(resolve, duration);
    });

    this.window_decoration.style.transition = `width ${duration}ms linear, height ${duration}ms linear`;

    // Coerce height and width into pixel string values
    //
    if (typeof width === "number")  { width  += "px"; }
    if (typeof height === "number") { height += "px"; }

    // Set CSS height and width for window
    // 
    if (width !== null) {
      this.window_decoration.style.width = width
    }

    if (height !== null) {
      this.window_decoration.style.height = height
    }

    await transition_promise;
    this.window_decoration.style.transition = null;
    this.animating = false;
  }

  async setLayoutDesktop () {
    this.layout_mobile_radio.checked  = false;
    this.layout_desktop_radio.checked = true;

    await this.resizeWindowAnimated(
      this.window_decoration_max_width, null
    );

    this.maximized = true;
  }

  async setLayoutMobile () {
    this.layout_desktop_radio.checked = false;

    const window_height = this.window_decoration.offsetHeight;
    let   set_height = null; // by default, do not set height
    const min_height = Math.floor(this.mobile_width * 16 / 9);

    if (window_height <= min_height) {
      set_height = min_height
    }

    await this.resizeWindowAnimated(
      this.mobile_width,
      set_height
    );

    this.layout_mobile_radio.checked = true;
  }
}

customElements.define("demo-layout", LayoutDemo);
