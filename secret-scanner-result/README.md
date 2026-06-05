# 🔐 Secret Scanner Risk Scoring Engine

Reads a `scan-results.json` file and prints a colour-coded terminal report with:

| Field | Description |
|---|---|
| `rule_score` | Severity + privilege + exposure + public-repo weighting (0–100) |
| `ai_score` | Confidence + multi-detector corroboration + entropy signal (0–100) |
| `risk_score` | 50 % rule_score + 50 % ai_score (0–100) |
| `risk_level` | CRITICAL / HIGH / MEDIUM / LOW |
| `ai_justification` | Human-readable sentence explaining the verdict |

---

## 📁 File Structure

```
secret-scanner-score/
├── index.js          ← Entry point  (run this)
├── scorer.js         ← Scoring logic
├── reporter.js       ← Terminal renderer (ANSI colours)
├── scan-results.json ← Your findings input file
└── README.md
```

---

## ▶️ How to Run (VS Code Terminal)

### Prerequisites
- Node.js 16 or higher installed  
  Check: `node --version`

### Step 1 — Open the project folder in VS Code
```
File → Open Folder → select  secret-scanner-score/
```

### Step 2 — Open the integrated terminal
```
Terminal → New Terminal   (or  Ctrl + ` )
```

### Step 3 — Run the scorer
```bash
node index.js scan-results.json
```

To point at a different file:
```bash
node index.js /path/to/your/other-scan.json
```

### Step 4 — Check the scored JSON output
A file `scored-results.json` is written next to your input file automatically.

---

## 🎨 Terminal Colour Key

| Colour | Meaning |
|---|---|
| 🔴 Red | CRITICAL risk |
| 🟡 Yellow | HIGH risk |
| 🔵 Cyan | MEDIUM risk |
| 🟢 Green | LOW risk |

Progress bars (`████░░░░`) show score visually per finding.

---

## 📐 Scoring Formula

### Rule Score (0–100)
```
rule_score = severity_weight + privilege_weight
           + min(exposure_days × 0.5, 30)
           + (10 if public repo)
```

Weights:
- Severity  : CRITICAL=40, HIGH=25, MEDIUM=15, LOW=5
- Privilege : Admin=30, High=25, Medium=15, Low=5

### AI Score (0–100)
```
ai_score = confidence
         + (5 if multiDetector)
         + (5 if multiple sources)
         + min((entropy / 5) × 20, 20)
         - (15 if inComment)
```

### Risk Score (0–100)
```
risk_score = round(rule_score × 0.5 + ai_score × 0.5)
```

### Risk Level
| Score | Level |
|---|---|
| ≥ 85 | CRITICAL |
| 65–84 | HIGH |
| 45–64 | MEDIUM |
| < 45 | LOW |
