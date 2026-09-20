import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "www");

// The debug APK loads the production Entrega365 origin through Capacitor's
// server.url. Keep www empty so the web production files are never copied
// into the mobile build and never duplicated into a parallel app database.
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

console.log("Entrega365 mobile: www preparado. O APK usará https://www.entrega365.com.br.");
