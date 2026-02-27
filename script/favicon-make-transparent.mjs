/**
 * Load PNG, remove white background, fill inside of Z with white, make logo bigger in frame, save as favicon.
 * Run: node script/favicon-make-transparent.mjs
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcPath = process.env.FAVICON_SRC || join(root, "client/public/logo-source.png");
const outPath = join(root, "client/public/favicon.png");

const WHITE_THRESHOLD = 245;
// Color match tolerance for flood fill (treat as same color if all channels within this)
const FLOOD_TOLERANCE = 25;
// Scale logo to 115% so it appears bigger in the tab
const LOGO_SCALE = 1.15;

function getPixel(data, width, channels, x, y) {
  if (x < 0 || x >= width || y < 0 || y >= width) return null;
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function setPixel(data, width, channels, x, y, r, g, b, a) {
  const i = (y * width + x) * channels;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = a;
}

function colorMatch(a, b, tol = FLOOD_TOLERANCE) {
  return (
    Math.abs(a[0] - b[0]) <= tol &&
    Math.abs(a[1] - b[1]) <= tol &&
    Math.abs(a[2] - b[2]) <= tol
  );
}

/**
 * Flood fill from (startX,startY), replace matching color with white.
 * Returns the number of pixels filled. Only call setPixel when doFill is true.
 */
function floodFill(data, width, height, channels, startX, startY, doFill) {
  const start = getPixel(data, width, channels, startX, startY);
  if (!start || start[3] === 0) return 0;
  const stack = [[startX, startY]];
  const visited = new Set();
  const key = (x, y) => y * width + x;
  const target = [start[0], start[1], start[2]];
  let count = 0;

  while (stack.length) {
    const [x, y] = stack.pop();
    const k = key(x, y);
    if (visited.has(k)) continue;
    visited.add(k);
    const p = getPixel(data, width, channels, x, y);
    if (!p || p[3] === 0) continue;
    if (!colorMatch([p[0], p[1], p[2]], target)) continue;

    count++;
    if (doFill) setPixel(data, width, channels, x, y, 255, 255, 255, 255);

    if (x > 0) stack.push([x - 1, y]);
    if (x < width - 1) stack.push([x + 1, y]);
    if (y > 0) stack.push([x, y - 1]);
    if (y < height - 1) stack.push([x, y + 1]);
  }
  return count;
}

const image = sharp(readFileSync(srcPath));
const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// 1. Make white background transparent
for (let i = 0; i < data.length; i += channels) {
  const r = data[i],
    g = data[i + 1],
    b = data[i + 2];
  if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
    data[i + 3] = 0;
  }
}

// 2. Fill inside of Z with white. The "hole" of the Z is a small enclosed region.
// If we flood from center we might get the whole blue square. Try center first; if the
// region is small (< 15% of pixels), it's the Z's hole - fill it. Otherwise try a few
// points in the middle to find the hole.
const total = width * height;
const cx = Math.floor(width / 2);
const cy = Math.floor(height / 2);
let filled = floodFill(data, width, height, channels, cx, cy, false);
const fillThreshold = total * 0.15;
if (filled > 0 && filled < fillThreshold) {
  floodFill(data, width, height, channels, cx, cy, true);
} else {
  // Try points slightly off-center (the Z hole might not be at exact center)
  const seeds = [
    [cx, cy],
    [Math.floor(width * 0.48), Math.floor(height * 0.52)],
    [Math.floor(width * 0.52), Math.floor(height * 0.48)],
    [Math.floor(width * 0.5), Math.floor(height * 0.45)],
    [Math.floor(width * 0.5), Math.floor(height * 0.55)],
  ];
  for (const [sx, sy] of seeds) {
    filled = floodFill(data, width, height, channels, sx, sy, false);
    if (filled > 0 && filled < fillThreshold) {
      floodFill(data, width, height, channels, sx, sy, true);
      break;
    }
  }
}

// 3. Scale logo up so it appears bigger in the tab (then fit into 512x512)
const size = 512;
const scaledW = Math.round(width * LOGO_SCALE);
const scaledH = Math.round(height * LOGO_SCALE);
let result = sharp(data, { raw: { width, height, channels } })
  .resize(scaledW, scaledH)
  .resize(size, size, { fit: "cover", position: "center" });

await result.png().toFile(outPath);
console.log("Favicon written to client/public/favicon.png (transparent bg, Z filled white, logo scaled up).");
