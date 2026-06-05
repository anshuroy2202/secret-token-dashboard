const SEVERITY_WEIGHTS = { CRITICAL: 40, HIGH: 25, MEDIUM: 15, LOW: 5 };
const PRIVILEGE_WEIGHTS = { Admin: 30, High: 25, Medium: 15, Low: 5 };
const EXPOSURE_FACTOR = 0.5;
const PUBLIC_BONUS = 10;

function calcRuleScore(finding) {
  const sev = SEVERITY_WEIGHTS[finding.severity] ?? 0;
  const priv = PRIVILEGE_WEIGHTS[finding.privilege] ?? 0;
  const exp = Math.min((finding.exposure_days ?? 0) * EXPOSURE_FACTOR, 30);
  const pub = finding.repo_visibility === "Public" ? PUBLIC_BONUS : 0;
  return Math.min(Math.round(sev + priv + exp + pub), 100);
}

function calcAIScore(finding) {
  const base = finding.confidence ?? 0;
  const multiBonus = finding.multiDetector ? 5 : 0;
  const sources = Array.isArray(finding.sources) ? finding.sources : [];
  const detSrc = sources.length > 1 ? 5 : 0;
  const entropy = Math.min(((finding.Entropy ?? 0) / 5) * 20, 20);
  const commentPenalty = finding.inComment ? -15 : 0;
  return Math.min(Math.round(base + multiBonus + detSrc + entropy + commentPenalty), 100);
}

function calcRiskScore(ruleScore, aiScore) {
  return Math.min(Math.round(ruleScore * 0.5 + aiScore * 0.5), 100);
}

function calcRiskLevel(riskScore) {
  if (riskScore >= 85) return "CRITICAL";
  if (riskScore >= 65) return "HIGH";
  if (riskScore >= 45) return "MEDIUM";
  return "LOW";
}

function buildJustification(finding, ruleScore, aiScore, riskScore, riskLevel) {
  const sources = Array.isArray(finding.sources) ? finding.sources : [];
  const parts = [];
  parts.push(`${finding.secret_type} detected in '${finding.File}' at line ${finding.StartLine}.`);
  parts.push(`Severity is ${finding.severity} with ${finding.privilege}-level privilege.`);
  parts.push(`Secret has been publicly exposed for ${finding.exposure_days} day(s).`);
  const confLabel = finding.confidence >= 85 ? "high" : finding.confidence >= 70 ? "moderate" : "low";
  parts.push(`Detector confidence is ${confLabel} (${finding.confidence}%).`);
  if (sources.length > 1) {
    parts.push(`Corroborated by ${sources.length} scanners (${sources.join(", ")}).`);
  }
  parts.push(`Composite risk score: ${riskScore}/100 → Level: ${riskLevel}. Immediate remediation recommended.`);
  return parts.join(" ");
}

export function scoreFindings(findings) {
  return findings.map((finding, index) => {
    const ruleScore = calcRuleScore(finding);
    const aiScore = calcAIScore(finding);
    const riskScore = calcRiskScore(ruleScore, aiScore);
    const riskLevel = calcRiskLevel(riskScore);
    return {
      index: index + 1,
      ...finding,
      rule_score: ruleScore,
      ai_score: aiScore,
      risk_score: riskScore,
      risk_level: riskLevel,
      ai_justification: buildJustification(finding, ruleScore, aiScore, riskScore, riskLevel)
    };
  });
}