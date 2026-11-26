import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const required = ["index.html", "styles.css", "app.js", "assets/arrival.jpg", "assets/arrival.mp4"];

for (const filename of required) {
  if (!existsSync(path.join(root, filename))) errors.push("Missing required file: " + filename);
}
if (errors.length === 0) {
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  const css = readFileSync(path.join(root, "styles.css"), "utf8");
  const js = readFileSync(path.join(root, "app.js"), "utf8");
  for (const page of ["home", "about", "book", "contact", "account"]) {
    if (!html.includes('id="page-' + page + '"')) {
      errors.push("Missing public route: " + page);
    }
  }
  if (!html.includes('id="hero-video"')) errors.push("Hero video is missing");
  if (!html.includes('id="booking-form"')) errors.push("Booking demo is missing");
  if (!html.includes('id="track-results"')) errors.push("Tracking demo is missing");
  if (!html.includes('id="mobile-nav"')) errors.push("Mobile navigation is missing");
  if (!html.includes('name="viewport"')) errors.push("Viewport metadata is missing");
  if (!js.includes("localStorage")) errors.push("Demo storage implementation needs review");
  const refs = [...html.matchAll(/(?:src|poster|href)=["'](assets\/[^"'?#]+)["']/g)].map(m => m[1]);
  const cssRefs = [...css.matchAll(/url\(\s*["']?(assets\/[^"'\s)]+)["']?\s*\)/g)].map(m => m[1]);
  for (const ref of new Set([...refs, ...cssRefs])) {
    if (ref.includes("..") || !existsSync(path.join(root, ref))) {
      errors.push("Missing or unsafe media reference: " + ref);
    }
  }
}
if (errors.length) {
  for (const error of errors) console.error("✗ " + error);
  process.exitCode = 1;
} else {
  console.log("✓ Five public routes, booking demo, navigation, and referenced assets are present.");
}
