#!/usr/bin/env node
// index.js — Entry point: load scan results → score → report

const fs       = require("fs");
const path     = require("path");
const { scoreFindings } = require("./scorer");
const { report }        = require("./reporter");

// ─── Resolve input file ──────────────────────────────────────────────────────

const inputArg = process.argv[2];

if (!inputArg) {
  console.error("\x1b[31mUsage: node index.js <path-to-scan-results.json>\x1b[0m");
  console.error("Example: node index.js scan-results.json");
  process.exit(1);
}

const inputPath = path.resolve(inputArg);

if (!fs.existsSync(inputPath)) {
  console.error(`\x1b[31mFile not found: ${inputPath}\x1b[0m`);
  process.exit(1);
}

// ─── Load & validate ─────────────────────────────────────────────────────────

let findings;
try {
  const raw = fs.readFileSync(inputPath, "utf8");
  findings  = JSON.parse(raw);
  if (!Array.isArray(findings)) throw new Error("Expected a JSON array.");
} catch (err) {
  console.error(`\x1b[31mFailed to parse JSON: ${err.message}\x1b[0m`);
  process.exit(1);
}

// ─── Score & Report ───────────────────────────────────────────────────────────

const scored = scoreFindings(findings);
report(scored);

// ─── Optional: write scored JSON ─────────────────────────────────────────────

const outPath = path.join(path.dirname(inputPath), "scored-results.json");
fs.writeFileSync(outPath, JSON.stringify(scored, null, 2));
console.log(`\x1b[36m  Scored JSON written to: ${outPath}\x1b[0m\n`);
