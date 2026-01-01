import { toggleFullscreen } from "./game.js";


export function drawBar (ctx, ratio, x, y, w, h, border_width=2) {
  if (ratio < 0) ratio = 0;
  else if (ratio >= 1) ratio = 1;

  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#000";
  const filled_width = (w - 2*border_width) * ratio;
  ctx.fillRect(x + border_width + filled_width, y+border_width, w-2*border_width-filled_width, h-2*border_width);
  ctx.restore();
}


export function drawFillRect (ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}


export function pointInRect (x, y, rx, ry, rw, rh) {
  return (
    rx <= x && x < rx + w &&
    ry <= y && y < ry + h
  );
}


export function rectsIntersect (ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    ax < bc+bw && ax+aw > bx &&
    ay < by+bh && ay+ah > by
  );
}


export function circleIntersectsRect (cx, cy, cr, rx, ry, rw, rh) {
  // Find the nearest edges in the rect to the circle

  const nearest_x = Math.max(rx, Math.min(cx, rx+rw));
  const nearest_y = Math.max(ry, Math.min(cy, ry+rh));

  const delta_x    = cx - nearest_x;
  const delta_y    = cy - nearest_y;
  const delta_a2b2 = delta_x * delta_x + delta_y * delta_y;

  return delta_a2b2 <= cr * cr;
}


export function makeElement (obj={}) {
  if (Array.isArray(obj)) {
    const elements = [];
    for (let element_definition of obj) {
      if (element_definition instanceof HTMLElement) {
        elements.push(element_definition);

      } else if (Array.isArray(element_definition)) {
        const wrapper = document.createElement("div");
        const children = makeElement(element_definition);

        for (let child of children)
          wrapper.appendChild(child);

      } else {
        elements.push(makeElement(element_definition));
      }
    }
    return elements;
  }

  const tag = obj.tag ?? "div";
  const element = document.createElement(tag);
  
  if (obj.classes) {
    element.classList = obj.classes;
  }

  if (obj.id) {
    element.id = obj.id;
  }

  if (obj.innerHTML) {
    element.innerHTML = obj.innerHTML;

  } else if (obj.text) {
    element.textContent = obj.text;
  }

  if (obj.style) {
    for (let [property, value] of Object.entries(obj.style)) {
      element.style[property] = value;
    }
  }

  if (obj.children) {
    let children = makeElement(obj.children);
    if (! Array.isArray(children)) {
      children = [children];
    }

    for (let child of children) {
      element.appendChild(child);
    }
  }

  return element;
}


export function makeFullscreenButton (element_definition={}) {
  const element = makeElement({
    tag: "button",
    text: "Fullscreen",
    classes: "fullscreen",
    ...element_definition,
  });

  element.addEventListener("click", (e) => {
    toggleFullscreen();
  });

  return element;
}


export function assignInto (into, value) {
  let into_object = into;
  let into_key    = value;

  while (Array.isArray(into_object) && into_object.length == 2) {
    [into_object, into_key] = into_object;;
  }

  if (!into_object) {
    throw "Into object is falsey";
  }

  into_object[into_key] = value;
  return value;
}
