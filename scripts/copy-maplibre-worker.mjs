import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// MapLibre 6 looks for its worker next to the bundled module, which does not exist under Turbopack.
// The worker and its shared chunk are copied to public/ and loaded through setWorkerUrl().
const require = createRequire(import.meta.url);
const distDirectory = dirname(require.resolve("maplibre-gl/package.json")) + "/dist";
const targetDirectory = join("public", "maplibre");
const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

mkdirSync(targetDirectory, { recursive: true });

for (const file of files) {
  copyFileSync(join(distDirectory, file), join(targetDirectory, file));
}

console.log(`Copied ${files.length} MapLibre worker files to ${targetDirectory}.`);
