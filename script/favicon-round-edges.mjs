/**
 * Replace favicon with logo and apply rounded corners.
 * Run: node script/favicon-round-edges.mjs
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcPath = process.env.FAVICON_SRC || join(root, "client/public/logo-source.png");
const outPath = join(root, "client/public/favicon.png");

// Corner radius as fraction of smaller dimension (e.g. 0.15 = 15%)
const CORNER_RADIUS_FRAC = 0.15;
const FAVICON_SIZE = 512;

function insideRoundedRect(x, y, w, h, r) {
  if (x < 0 || x >= w || y < 0 || y >= h) return 0;
  const inCenter = (x >= r && x < w - r) || (y >= r && y < h - r);
  if (inCenter) return 1;
  const corners = [
    [r, r],
    [w - 1 - r, r],
    [r, h - 1 - r],
    [w - 1 - r, h - 1 - r],
  ];
  for (const [cx, cy] of corners) {
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy <= r * r) return 1;
  }
  return 0;
}

const image = sharp(readFileSync(srcPath));
const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
let { width, height, channels } = info;

const r = Math.min(width, height) * CORNER_RADIUS_FRAC;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const mask = insideRoundedRect(x, y, width, height, r);
    const i = (y * width + x) * channels;
    data[i + 3] = Math.round((data[i + 3] / 255) * mask * 255);
  }
}

let result = sharp(data, { raw: { width, height, channels } })
  .resize(FAVICON_SIZE, FAVICON_SIZE)
  .png();

await result.toFile(outPath);
console.log("Favicon written to client/public/favicon.png with rounded edges.");
