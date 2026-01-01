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
