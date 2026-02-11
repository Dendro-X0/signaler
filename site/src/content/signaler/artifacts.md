# Artifacts

Signaler generates a variety of artifacts in the `.signaler` directory after each audit. These files are useful for debugging, CI integration, and long-term tracking.

## Report Files

-   `report.html`: An interactive, visual report of the audit results. Open this in your browser.
-   `summary.json`: The complete raw JSON data for the entire audit run.
-   `triage.md`: A prioritized list of issues to fix, formatted as Markdown.

## AI Analysis

-   `AI-ANALYSIS.json`: A structured analysis of the audit results, optimized for AI processing (75% token reduction).
-   `AI-SUMMARY.json`: An ultra-condensed summary of the key findings (95% token reduction).

## CI/CD Artifacts

-   `budgets.json`: Detailed breakdown of budget pass/fail status.
-   `junit.xml`: Test results in JUnit format for CI integration (e.g., Jenkins, GitLab CI).
