/*
  Spritesheet handling, initialization, and organizing spritesheets into an object for easy use.
*/

export const spritesheets = {
  monsters: "static/32rogues/monsters.png",
  rogues:   "static/32rogues/rogues.png",
  items:    "static/32rogues/items.png",
  tiles:    "static/32rogues/tiles.png",
  animals:  "static/32rogues/animals.png",
  coins:    "static/coins.png",
};

window.spritesheets = spritesheets;

export default spritesheets;

export class Spritesheet {
  constructor (src, cell_w=32, cell_h=32, scaling=2.5) {
    this.src = src;
    this.cell_w = cell_w;
    this.cell_h = cell_h;

    // How many spritesheet cells are in the bounds of the image
    this.cells_w = null;
    this.cells_h = null;
    this.length  = null;

    this.scaling = scaling;
    this.loaded = false;

    this.img = new Image();

    this.img.onload = ((e) => {
      this.loaded  = true;
      this.cells_w = (this.img.width  / this.cell_w) >> 0;
      this.cells_h = (this.img.height / this.cell_h) >> 0;
      this.length  = this.cells_w * this.cells_h;
    });

    this.img.src = src;
  }

  drawCell (ctx, cx, cy, dx, dy, dw=null, dh=null) {
    if (dw === null) dw = this.cell_w * this.scaling;
    if (dh === null) dw = this.cell_h * this.scaling;

    ctx.drawImage(
        this.img,
        cx * this.cell_w,
        cy * this.cell_h,
        this.cell_w,
        this.cell_h,
        dx, dy, dw, dh
      );
  }

  drawCellIndex (ctx, cell_i, dx, dy, dw=null, dh=null) {
    const cx = cell_i % this.cells_w;
    const cy = (cell_i / this.cells_w) >> 0;
    this.drawCell(ctx, cx, cy, dx, dy, dw, dh);
  }

  imageFromCellIndex (cell_i) {
    const sprite_canvas = document.createElement("canvas");
    const sprite_ctx    = sprite_canvas.getContext("2d");
    sprite_canvas.width  = this.cell_w;
    sprite_canvas.height = this.cell_h;
    sprite_canvas.imageSmoothingEnabled = false;

    this.drawCellIndex(
        sprite_ctx, cell_i, 0, 0, this.cell_w, this.cell_h
      );

    const image = new Image();
    image.src = sprite_canvas.toDataURL();
    return image;
  }
}

export function initAssets () {
  let have   = 0;
  let expect = 0;

  for (let [sheet_name, sheet] of Object.entries(spritesheets)) {
    expect++;
    if (typeof sheet == "string") {
      spritesheets[sheet_name] = new Spritesheet(sheet);
    } else {
      if (sheet.loaded) {
        have++;
      }
      continue;
    }
  }

  return [have, expect, have/expect];
}
