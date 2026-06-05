// scorer.js — Computes rule_score, ai_score, risk_score, risk_level, ai_justification

const SEVERITY_WEIGHTS = { CRITICAL: 40, HIGH: 25, MEDIUM: 15, LOW: 5 };
const PRIVILEGE_WEIGHTS = { Admin: 30, High: 25, Medium: 15, Low: 5 };
const EXPOSURE_FACTOR   = 0.5;   // points per day exposed (cap 30)
const PUBLIC_BONUS      = 10;    // extra points if repo is public

/**
 * Rule Score (0–100)
 * Based on: severity, privilege, exposure days, public visibility
 */
function calcRuleScore(finding) {
  const sev  = SEVERITY_WEIGHTS[finding.severity]  ?? 0;
  const priv = PRIVILEGE_WEIGHTS[finding.privilege] ?? 0;
  const exp  = Math.min(finding.exposure_days * EXPOSURE_FACTOR, 30);
  const pub  = finding.repo_visibility === "Public" ? PUBLIC_BONUS : 0;
  return Math.min(Math.round(sev + priv + exp + pub), 100);
}

/**
 * AI Score (0–100)
 * Weighted blend of confidence, multi-detector bonus, entropy, comment penalty
 */
function calcAIScore(finding) {
  const base      = finding.confidence;                       // 0-100
  const multiBonus = finding.multiDetector ? 5 : 0;
  const detSrc    = finding.sources.length > 1 ? 5 : 0;      // corroboration
  const entropy   = Math.min((finding.Entropy / 5) * 20, 20); // normalise to 20
  const commentPenalty = finding.inComment ? -15 : 0;
  return Math.min(Math.round(base + multiBonus + detSrc + entropy + commentPenalty), 100);
}

/**
 * Risk Score (0–100)
 * Weighted composite: 50% rule score + 50% ai score, then capped
 */
function calcRiskScore(ruleScore, aiScore) {
  return Math.min(Math.round(ruleScore * 0.5 + aiScore * 0.5), 100);
}

/**
 * Risk Level label
 */
function calcRiskLevel(riskScore) {
  if (riskScore >= 85) return "CRITICAL";
  if (riskScore >= 65) return "HIGH";
  if (riskScore >= 45) return "MEDIUM";
  return "LOW";
}

/**
 * AI Justification — human-readable sentence
 */
function buildJustification(finding, ruleScore, aiScore, riskScore, riskLevel) {
  const parts = [];

  // Secret type & location
  parts.push(`${finding.secret_type} detected in '${finding.File}' at line ${finding.StartLine}.`);

  // Severity & privilege context
  parts.push(`Severity is ${finding.severity} with ${finding.privilege}-level privilege.`);

  // Exposure
  parts.push(`Secret has been publicly exposed for ${finding.exposure_days} day(s).`);

  // Confidence
  const confLabel = finding.confidence >= 85 ? "high" : finding.confidence >= 70 ? "moderate" : "low";
  parts.push(`Detector confidence is ${confLabel} (${finding.confidence}%).`);

  // Multi-source corroboration
  if (finding.sources.length > 1) {
    parts.push(`Corroborated by ${finding.sources.length} scanners (${finding.sources.join(", ")}).`);
  }

  // Composite verdict
  parts.push(`Composite risk score: ${riskScore}/100 → Level: ${riskLevel}. Immediate rotation and git-history purge recommended.`);

  return parts.join(" ");
}

/**
 * Main scoring entry point
 * @param {Array} findings — raw JSON array from scan-results
 * @returns {Array} scored findings
 */
function scoreFindings(findings) {
  return findings.map((f, idx) => {
    const ruleScore = calcRuleScore(f);
    const aiScore   = calcAIScore(f);
    const riskScore = calcRiskScore(ruleScore, aiScore);
    const riskLevel = calcRiskLevel(riskScore);
    const aiJustification = buildJustification(f, ruleScore, aiScore, riskScore, riskLevel);

    return {
      index: idx + 1,
      file: f.File,
      ruleId: f.RuleID,
      secretType: f.secret_type,
      severity: f.severity,
      privilege: f.privilege,
      exposureDays: f.exposure_days,
      confidence: f.confidence,
      status: f.status,
      rule_score: ruleScore,
      ai_score: aiScore,
      risk_score: riskScore,
      risk_level: riskLevel,
      ai_justification: aiJustification,
    };
  });
}

module.exports = { scoreFindings };
