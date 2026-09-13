// Memastikan aturan modularitas: fitur tidak boleh mengimpor fitur lain.
//   frontend : src/features/<a>/** tidak boleh mengimpor "@/features/<b>" atau "../<b>"
//   backend  : src-tauri/src/features/<a>/** tidak boleh memakai "crate::features::<b>"
// Pengecualian: features/registry.ts, features/types.ts, features/mod.rs, dan features/home
// (home hanya membaca registry).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const problems = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function featureOf(file, featuresDir) {
  const rel = relative(featuresDir, file).split(sep);
  return rel.length > 1 ? rel[0] : null;
}

// Frontend
{
  const featuresDir = join(root, "src", "features");
  for (const file of walk(featuresDir).filter((f) => /\.(ts|tsx)$/.test(f))) {
    const feature = featureOf(file, featuresDir);
    if (!feature || feature === "home") continue;
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/from\s+["']@\/features\/([^"'/]+)/g)) {
      const target = m[1];
      if (target !== feature && target !== "types" && target !== "registry") {
        problems.push(`${relative(root, file)} -> @/features/${target}`);
      }
    }
    // Impor relatif boleh, selama tidak keluar dari folder fitur sendiri
    // (kecuali ke features/types atau features/registry).
    for (const m of text.matchAll(/from\s+["'](\.\.?\/[^"']+)["']/g)) {
      const target = resolve(dirname(file), m[1]);
      const rel = relative(featuresDir, target).split(sep);
      const escapes = rel[0] === ".." || (rel.length > 1 && rel[0] !== feature);
      const allowed = rel.length === 1 && ["types", "registry"].includes(rel[0].replace(/\.tsx?$/, ""));
      if (escapes && !allowed) problems.push(`${relative(root, file)} -> ${m[1]}`);
    }
  }
}

// Backend
{
  const featuresDir = join(root, "src-tauri", "src", "features");
  for (const file of walk(featuresDir).filter((f) => f.endsWith(".rs"))) {
    const feature = featureOf(file, featuresDir);
    if (!feature) continue;
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/crate::features::([a-z_]+)/g)) {
      if (m[1] !== feature) problems.push(`${relative(root, file)} -> crate::features::${m[1]}`);
    }
  }
}

if (problems.length) {
  console.error("Pelanggaran aturan dependensi antar fitur:");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log("OK: tidak ada impor lintas fitur.");
