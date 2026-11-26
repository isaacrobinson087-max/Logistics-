import { rm, mkdir, cp, copyFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const filename of ["index.html", "styles.css", "app.js", "_headers", "robots.txt"]) {
  await copyFile(path.join(root, filename), path.join(output, filename));
}
await cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });

const html = await stat(path.join(output, "index.html"));
console.log("Cloudflare Pages static output prepared in dist/ (" + html.size + "-byte entry page).");
