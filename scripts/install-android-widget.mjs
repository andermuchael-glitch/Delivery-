import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const android = path.join(root, "android");
const app = path.join(android, "app");

const javaDir = path.join(app, "src/main/java/br/com/entrega365/app");
const layoutDir = path.join(app, "src/main/res/layout");
const drawableDir = path.join(app, "src/main/res/drawable");
const valuesDir = path.join(app, "src/main/res/values");
const xmlDir = path.join(app, "src/main/res/xml");

await Promise.all([
  mkdir(javaDir, { recursive: true }),
  mkdir(layoutDir, { recursive: true }),
  mkdir(drawableDir, { recursive: true }),
  mkdir(valuesDir, { recursive: true }),
  mkdir(xmlDir, { recursive: true })
]);

await copyFile(path.join(root, "android-widget/QuickLaunchPlugin.java"), path.join(javaDir, "QuickLaunchPlugin.java"));
await copyFile(path.join(root, "android-widget/MainActivity.java"), path.join(javaDir, "MainActivity.java"));
await copyFile(path.join(root, "android-widget/Entrega365QuickComandaWidget.java"), path.join(javaDir, "Entrega365QuickComandaWidget.java"));\nawait copyFile(path.join(root, "android-widget/QuickComandaActivity.java"), path.join(javaDir, "QuickComandaActivity.java"));
await copyFile(path.join(root, "android-widget/widget_quick_comanda.xml"), path.join(layoutDir, "widget_quick_comanda.xml"));
await copyFile(path.join(root, "android-widget/widget_quick_comanda_bg.xml"), path.join(drawableDir, "widget_quick_comanda_bg.xml"));
await copyFile(path.join(root, "android-widget/widget_quick_comanda_button.xml"), path.join(drawableDir, "widget_quick_comanda_button.xml"));
await copyFile(path.join(root, "android-widget/widget_strings.xml"), path.join(valuesDir, "widget_strings.xml"));
await copyFile(path.join(root, "android-widget/widget_quick_comanda_info.xml"), path.join(xmlDir, "widget_quick_comanda_info.xml"));

const manifestPath = path.join(app, "src/main/AndroidManifest.xml");
let manifest = await readFile(manifestPath, "utf8");

if (!manifest.includes("QuickComandaActivity")) {\n  const activity = `\n        <activity android:name=".QuickComandaActivity" android:exported="false" android:theme="@android:style/Theme.Material.Dialog.NoActionBar" />\n`;\n  manifest = manifest.replace("</application>", activity + "    </application>");\n}\n\nif (!manifest.includes("Entrega365QuickComandaWidget")) {
  const receiver = `
        <receiver
            android:name=".Entrega365QuickComandaWidget"
            android:exported="true"
            android:label="Entrega365 — Nova Comanda">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/widget_quick_comanda_info" />
        </receiver>
`;
  manifest = manifest.replace("</application>", receiver + "    </application>");
}

manifest = manifest.replace(
  /(<activity\s+android:name="\.MainActivity"[^>]*)(>)/,
  (full, attrs, end) => attrs.includes("android:launchMode=")
    ? full
    : attrs + ' android:launchMode="singleTop"' + end
);

await writeFile(manifestPath, manifest);
console.log("Entrega365: widget de lançamento rápido instalado no projeto Android.");
