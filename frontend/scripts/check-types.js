#!/usr/bin/env node
/**
 * Type-check gate for CI.
 *
 * The project still has older type errors, so `tsc` cannot simply be required to pass.
 * Instead this fails when the number of errors goes UP compared with the baseline in
 * scripts/tsc-baseline.json. When you fix errors, lower the baseline in the same commit.
 *
 * Usage: node scripts/check-types.js   (from the frontend folder)
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const baselinePath = path.join(__dirname, "tsc-baseline.json");
const { maxErrors } = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

const tscBin = path.join(root, "node_modules", "typescript", "bin", "tsc");
const result = spawnSync(process.execPath, [tscBin, "-p", ".", "--noEmit", "--pretty", "false"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});

const output = `${result.stdout || ""}${result.stderr || ""}`;
const errors = output.split(/\r?\n/).filter((line) => /error TS\d+:/.test(line));

console.log(`TypeScript errors: ${errors.length} (baseline: ${maxErrors})`);

if (errors.length > maxErrors) {
  console.error(`\n${errors.length - maxErrors} new type error(s) introduced. All current errors:\n`);
  console.error(errors.join("\n"));
  process.exit(1);
}

if (errors.length < maxErrors) {
  console.log(
    `Nice: ${maxErrors - errors.length} fewer errors than the baseline. ` +
      `Lower "maxErrors" in scripts/tsc-baseline.json to ${errors.length} to lock this in.`
  );
}
