import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "www");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const excluded = new Set([
  ".git",
  ".github",
  "node_modules",
  "www",
  "android",
  "ios",
  "api",
  "database",
  "db",
  "scripts",
  "package.json",
  "package-lock.json",
  "capacitor.config.json",
  ".env",
  ".env.example"
]);

await cp(root, out, {
  recursive: true,
  filter(source) {
    const rel = path.relative(root, source);
    if (!rel) return true;
    const first = rel.split(path.sep)[0];
    return !excluded.has(first);
  }
});

console.log("Entrega365: assets web preparados em www/");
