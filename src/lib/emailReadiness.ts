export interface EmailReadinessIssue {
  severity: "error" | "warning";
  text: string;
}

export function evaluateEmailHtmlReadiness(html: string): EmailReadinessIssue[] {
  const issues: EmailReadinessIssue[] = [];

  if (!html.trim()) {
    issues.push({ severity: "error", text: "Email HTML content is empty." });
    return issues;
  }

  if (/<(script|form|video|iframe)\b/i.test(html)) {
    issues.push({ severity: "error", text: "Unsupported tags like script, form, video, or iframe are present." });
  }

  if (/http:\/\//i.test(html)) {
    issues.push({ severity: "warning", text: "Some assets use HTTP instead of HTTPS." });
  }

  const hasUnsubscribePlaceholder = html.includes("{{unsubscribe_url}}");
  if (/unsubscribe/i.test(html) && !hasUnsubscribePlaceholder) {
    issues.push({ severity: "error", text: "An unsubscribe link is shown, but the unsubscribe placeholder is missing." });
  }

  const hasImageWithoutAlt = /<img\b(?![^>]*\balt=)[^>]*>/i.test(html);
  if (hasImageWithoutAlt) {
    issues.push({ severity: "warning", text: "One or more images are missing alt text." });
  }

  const hasEmptyHref = /<a\b[^>]*href=["']\s*#?\s*["']/i.test(html);
  if (hasEmptyHref) {
    issues.push({ severity: "warning", text: "One or more links look empty or still point to a placeholder URL." });
  }

  return issues;
}
