#!/usr/bin/env node
/**
 * Runtime-version guard for over-the-air (EAS) updates.
 *
 * An OTA update only contains JavaScript and assets. It is delivered to installed builds
 * with the same runtime version. If native code changes (android/, ios/, or a native
 * dependency in package.json) the installed apps cannot run the new JavaScript, so the
 * runtime version must be bumped and a new build installed instead.
 *
 * This script fails when:
 *   1. the runtime version differs between app.json, Android strings.xml and iOS Expo.plist;
 *   2. BASE_SHA is set, native files changed since BASE_SHA, and the runtime version did not.
 *
 * Usage (from the frontend folder): BASE_SHA=<commit> node scripts/check-runtime-version.js
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function runtimeVersions() {
  const appJson = JSON.parse(read("app.json"));
  const strings = read("android/app/src/main/res/values/strings.xml");
  const plist = read("ios/demoirhisn/Supporting/Expo.plist");
  return {
    "app.json": appJson.expo.runtimeVersion,
    "android strings.xml": (strings.match(/<string name="expo_runtime_version">([^<]+)<\/string>/) || [])[1],
    "ios Expo.plist": (plist.match(/<key>EXUpdatesRuntimeVersion<\/key>\s*<string>([^<]+)<\/string>/) || [])[1],
  };
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

// 1. Consistency
const versions = runtimeVersions();
const distinct = new Set(Object.values(versions));
console.log("Runtime versions:", versions);
if (distinct.size !== 1 || distinct.has(undefined)) {
  fail("The runtime version must be identical in app.json, android strings.xml and ios Expo.plist.");
}
const current = versions["app.json"];

// 2. Native changes since BASE_SHA
const base = (process.env.BASE_SHA || "").trim();
if (!base || /^0+$/.test(base)) {
  console.log("No base commit given; skipping the native-change check.");
  process.exit(0);
}

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const fromBase = (rel) => {
  try {
    return git("show", `${base}:frontend/${rel}`);
  } catch {
    return null;
  }
};

const changed = git("diff", "--name-only", base, "HEAD", "--", ".").split(/\r?\n/).filter(Boolean);

// Ignore native files whose change is only comments or whitespace (e.g. the EAS CLI
// rewriting AndroidManifest.xml without its comments when it syncs the update config).
const showAt = (rev, repoPath) => {
  try {
    return git("show", `${rev}:${repoPath}`);
  } catch {
    return null; // file added or deleted
  }
};
const normalize = (text) =>
  text
    .replace(/<!--[\s\S]*?-->/g, "") // XML comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // /* block */ comments
    .replace(/^\s*\/\/.*$/gm, "") // whole-line // comments
    .replace(/\s+/g, "");
const isCosmeticChange = (repoPath) => {
  const before = showAt(base, repoPath);
  const after = showAt("HEAD", repoPath);
  return before !== null && after !== null && normalize(before) === normalize(after);
};

const nativeFiles = changed
  .filter((f) => /^frontend\/(android|ios)\//.test(f))
  .filter((f) => {
    if (isCosmeticChange(f)) {
      console.log(`Ignoring comment/whitespace-only change: ${f}`);
      return false;
    }
    return true;
  });

let dependencyChanges = [];
const oldPkgRaw = fromBase("package.json");
if (oldPkgRaw) {
  const oldDeps = JSON.parse(oldPkgRaw).dependencies || {};
  const newDeps = JSON.parse(read("package.json")).dependencies || {};
  const names = new Set([...Object.keys(oldDeps), ...Object.keys(newDeps)]);
  dependencyChanges = [...names].filter((n) => oldDeps[n] !== newDeps[n]);
}

if (nativeFiles.length === 0 && dependencyChanges.length === 0) {
  console.log("No native changes since base. OK to publish an OTA update.");
  process.exit(0);
}

const oldAppJson = fromBase("app.json");
const previous = oldAppJson ? JSON.parse(oldAppJson).expo.runtimeVersion : undefined;

console.log("Native files changed:", nativeFiles.length ? nativeFiles : "none");
console.log("Dependencies changed:", dependencyChanges.length ? dependencyChanges : "none");

if (previous === current) {
  fail(
    `Native code or dependencies changed but the runtime version is still "${current}".\n` +
      "  Bump the runtime version (app.json, android strings.xml, ios Expo.plist) and make a new\n" +
      "  EAS build. Installed apps cannot run this update. (If the dependency change is JS-only,\n" +
      "  bump the runtime version anyway or publish manually after checking.)"
  );
}

console.log(`Runtime version changed ${previous} → ${current}. A new build is required for this update to reach devices.`);
