// reporter.js — Pretty terminal output (VS Code-style) using ANSI colours

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";

const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN  = "\x1b[32m";
const CYAN   = "\x1b[36m";
const MAGENTA= "\x1b[35m";
const WHITE  = "\x1b[97m";
const BLUE   = "\x1b[34m";

const BG_RED    = "\x1b[41m";
const BG_YELLOW = "\x1b[43m";
const BG_GREEN  = "\x1b[42m";
const BG_CYAN   = "\x1b[46m";

// ─── Helpers ────────────────────────────────────────────────────────────────

function riskColor(level) {
  switch (level) {
    case "CRITICAL": return RED;
    case "HIGH":     return YELLOW;
    case "MEDIUM":   return CYAN;
    default:         return GREEN;
  }
}

function riskBg(level) {
  switch (level) {
    case "CRITICAL": return BG_RED    + WHITE;
    case "HIGH":     return BG_YELLOW + "\x1b[30m";
    case "MEDIUM":   return BG_CYAN   + "\x1b[30m";
    default:         return BG_GREEN  + "\x1b[30m";
  }
}

function bar(score, width = 30) {
  const filled = Math.round((score / 100) * width);
  const empty  = width - filled;
  const color  = score >= 85 ? RED : score >= 65 ? YELLOW : score >= 45 ? CYAN : GREEN;
  return color + "█".repeat(filled) + DIM + "░".repeat(empty) + RESET;
}

function pad(str, len) {
  return String(str).padEnd(len);
}

function center(str, len) {
  const s = String(str);
  const total = len - s.length;
  const left  = Math.floor(total / 2);
  const right = total - left;
  return " ".repeat(left) + s + " ".repeat(right);
}

const LINE  = "─".repeat(90);
const DLINE = "═".repeat(90);

// ─── Banner ─────────────────────────────────────────────────────────────────

function printBanner(total, critCount, highCount) {
  console.log();
  console.log(BOLD + CYAN + "╔" + "═".repeat(88) + "╗" + RESET);
  console.log(BOLD + CYAN + "║" + center("🔐  SECRET SCAN RISK SCORING ENGINE", 88) + "║" + RESET);
  console.log(BOLD + CYAN + "║" + center("Automated Security Finding Analyzer  •  v1.0.0", 88) + "║" + RESET);
  console.log(BOLD + CYAN + "╚" + "═".repeat(88) + "╝" + RESET);
  console.log();
  console.log(DIM + `  Scan Date : ${new Date().toLocaleString()}` + RESET);
  console.log(DIM + `  Findings  : ${total} total  |  ${RED}${critCount} CRITICAL${RESET}${DIM}  |  ${YELLOW}${highCount} HIGH${RESET}`);
  console.log();
}

// ─── Finding Card ────────────────────────────────────────────────────────────

function printFinding(f) {
  const rc = riskColor(f.risk_level);
  const bg = riskBg(f.risk_level);

  console.log(BOLD + BLUE + "┌" + LINE + "┐" + RESET);
  console.log(
    BOLD + BLUE + "│ " + RESET +
    BOLD + `[${String(f.index).padStart(2, "0")}]` + RESET +
    "  " + BOLD + WHITE + pad(f.file, 24) + RESET +
    DIM + "  RuleID: " + RESET + CYAN + pad(f.ruleId, 28) + RESET +
    "  " + bg + ` ${f.risk_level} ` + RESET +
    BLUE + "  │" + RESET
  );
  console.log(BOLD + BLUE + "├" + LINE + "┤" + RESET);

  // Scores row
  const ruleBar = bar(f.rule_score);
  const aiBar   = bar(f.ai_score);
  const riskBar = bar(f.risk_score);

  console.log(
    BLUE + "│ " + RESET +
    BOLD + "Rule Score " + RESET + `${String(f.rule_score).padStart(3)}/100  ` + ruleBar +
    BLUE + "  │" + RESET
  );
  console.log(
    BLUE + "│ " + RESET +
    BOLD + "AI Score   " + RESET + `${String(f.ai_score).padStart(3)}/100  ` + aiBar +
    BLUE + "  │" + RESET
  );
  console.log(
    BLUE + "│ " + RESET +
    BOLD + rc + "Risk Score " + RESET + rc + `${String(f.risk_score).padStart(3)}/100  ` + riskBar + RESET +
    BLUE + "  │" + RESET
  );

  // Meta row
  console.log(BLUE + "│ " + RESET +
    DIM + "Secret: " + RESET + MAGENTA + pad(f.secretType, 22) + RESET +
    DIM + "Severity: " + RESET + rc + BOLD + pad(f.severity, 10) + RESET +
    DIM + "Privilege: " + RESET + pad(f.privilege, 8) +
    DIM + "Exposure: " + RESET + YELLOW + `${f.exposureDays}d` + RESET +
    DIM + "  Conf: " + RESET + `${f.confidence}%` +
    BLUE + "  │" + RESET
  );

  // Justification
  const words = f.ai_justification.split(" ");
  const lines = [];
  let cur = "";
  words.forEach(w => {
    if ((cur + " " + w).trim().length <= 84) cur = (cur + " " + w).trim();
    else { lines.push(cur); cur = w; }
  });
  if (cur) lines.push(cur);

  console.log(BLUE + "│ " + RESET + DIM + "AI Justification:" + RESET);
  lines.forEach(l => console.log(BLUE + "│   " + RESET + WHITE + l + RESET));

  console.log(BOLD + BLUE + "└" + LINE + "┘" + RESET);
  console.log();
}

// ─── Summary Table ───────────────────────────────────────────────────────────

function printSummaryTable(scored) {
  console.log(BOLD + CYAN + "\n  ╔" + "═".repeat(86) + "╗" + RESET);
  console.log(BOLD + CYAN + "  ║" + center("SUMMARY TABLE", 86) + "║" + RESET);
  console.log(BOLD + CYAN + "  ╠" + "═".repeat(86) + "╣" + RESET);

  const hdr = [
    pad("#",   3),
    pad("File",             18),
    pad("Secret Type",      22),
    pad("Sev",               9),
    pad("Rule",  5),
    pad("AI",    5),
    pad("Risk",  5),
    pad("Level",  8),
  ].join("  ");
  console.log(BOLD + CYAN + "  ║ " + RESET + BOLD + hdr + RESET + CYAN + " ║" + RESET);
  console.log(BOLD + CYAN + "  ╠" + "═".repeat(86) + "╣" + RESET);

  scored.forEach(f => {
    const rc = riskColor(f.risk_level);
    const row = [
      pad(f.index,         3),
      pad(f.file,         18),
      pad(f.secretType,   22),
      rc + pad(f.severity, 9) + RESET,
      pad(f.rule_score,   5),
      pad(f.ai_score,     5),
      rc + BOLD + pad(f.risk_score, 5) + RESET,
      rc + BOLD + pad(f.risk_level, 8) + RESET,
    ].join("  ");
    console.log(CYAN + "  ║ " + RESET + row + CYAN + " ║" + RESET);
  });

  console.log(BOLD + CYAN + "  ╚" + "═".repeat(86) + "╝" + RESET);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function printStats(scored) {
  const avg = (arr) => (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1);
  const max = (arr) => Math.max(...arr);

  const rs  = scored.map(f => f.risk_score);
  const ais = scored.map(f => f.ai_score);
  const rls = scored.map(f => f.rule_score);

  const levels = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  scored.forEach(f => levels[f.risk_level]++);

  console.log();
  console.log(BOLD + WHITE + "  ─── AGGREGATE STATS " + "─".repeat(68) + RESET);
  console.log(`  Avg Risk Score  : ${BOLD}${avg(rs)}${RESET}   Max: ${RED}${BOLD}${max(rs)}${RESET}`);
  console.log(`  Avg AI Score    : ${BOLD}${avg(ais)}${RESET}   Max: ${YELLOW}${BOLD}${max(ais)}${RESET}`);
  console.log(`  Avg Rule Score  : ${BOLD}${avg(rls)}${RESET}   Max: ${CYAN}${BOLD}${max(rls)}${RESET}`);
  console.log();
  console.log(`  Risk Distribution:`);
  Object.entries(levels).forEach(([lvl, cnt]) => {
    const rc = riskColor(lvl);
    const barW = cnt * 5;
    console.log(`    ${rc}${BOLD}${pad(lvl, 10)}${RESET}  ${"█".repeat(barW)}  ${cnt}`);
  });
  console.log();
}

// ─── Export ──────────────────────────────────────────────────────────────────

function report(scored) {
  const critCount = scored.filter(f => f.risk_level === "CRITICAL").length;
  const highCount = scored.filter(f => f.risk_level === "HIGH").length;

  printBanner(scored.length, critCount, highCount);
  scored.forEach(printFinding);
  printSummaryTable(scored);
  printStats(scored);

  console.log(BOLD + RED + "  ⚠  ACTION REQUIRED: All active secrets above must be rotated immediately." + RESET);
  console.log(BOLD + DIM + "  Run `git filter-repo` or BFG Repo-Cleaner to purge secrets from history.\n" + RESET);
}

module.exports = { report };
