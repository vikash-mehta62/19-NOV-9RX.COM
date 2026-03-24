import { describe, expect, it } from "vitest";

import { evaluateEmailHtmlReadiness } from "./emailReadiness";

describe("evaluateEmailHtmlReadiness", () => {
  it("returns an error when html is empty", () => {
    expect(evaluateEmailHtmlReadiness("")).toEqual([
      { severity: "error", text: "Email HTML content is empty." },
    ]);
  });

  it("flags blocking email-hostile markup", () => {
    const issues = evaluateEmailHtmlReadiness(`
      <html>
        <body>
          <form action="/submit"></form>
          <script>alert("x")</script>
        </body>
      </html>
    `);

    expect(issues).toContainEqual({
      severity: "error",
      text: "Unsupported tags like script, form, video, or iframe are present.",
    });
  });

  it("flags unsubscribe text without the unsubscribe placeholder", () => {
    const issues = evaluateEmailHtmlReadiness(`
      <p>You can unsubscribe any time.</p>
    `);

    expect(issues).toContainEqual({
      severity: "error",
      text: "An unsubscribe link is shown, but the unsubscribe placeholder is missing.",
    });
  });

  it("returns warnings for weak-but-non-blocking markup", () => {
    const issues = evaluateEmailHtmlReadiness(`
      <a href="#">Read more</a>
      <img src="http://cdn.example.com/banner.png">
    `);

    expect(issues).toContainEqual({
      severity: "warning",
      text: "Some assets use HTTP instead of HTTPS.",
    });
    expect(issues).toContainEqual({
      severity: "warning",
      text: "One or more images are missing alt text.",
    });
    expect(issues).toContainEqual({
      severity: "warning",
      text: "One or more links look empty or still point to a placeholder URL.",
    });
  });

  it("accepts send-ready html without blocking issues", () => {
    const issues = evaluateEmailHtmlReadiness(`
      <html>
        <body>
          <h1>Welcome</h1>
          <p>Hello {{user_name}}</p>
          <a href="https://example.com/offers">Shop now</a>
          <a href="{{unsubscribe_url}}">Unsubscribe</a>
          <img src="https://cdn.example.com/banner.png" alt="Banner">
        </body>
      </html>
    `);

    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });
});
