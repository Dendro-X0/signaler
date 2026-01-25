import type { ApexDevice } from "./core/types.js";

/**
 * Represents an accessibility violation detected by axe-core.
 * Contains detailed information about the violation including impact level,
 * description, and affected DOM nodes.
 * 
 * @example
 * ```typescript
 * const violation: AxeViolation = {
 *   id: "color-contrast",
 *   impact: "serious",
 *   description: "Elements must have sufficient color contrast",
 *   help: "Ensure all text elements have sufficient color contrast",
 *   helpUrl: "https://dequeuniversity.com/rules/axe/4.4/color-contrast",
 *   nodes: [{ html: "<p>Low contrast text</p>", target: ["p"] }]
 * };
 * ```
 */
export type AxeViolation = {
  readonly id: string;
  readonly impact?: string;
  readonly description?: string;
  readonly help?: string;
  readonly helpUrl?: string;
  readonly nodes: readonly { readonly html?: string; readonly target?: readonly string[] }[];
};

/**
 * Represents the accessibility audit result for a single page and device combination.
 * Contains all violations found during the axe-core accessibility scan.
 * 
 * @example
 * ```typescript
 * const result: AxeResult = {
 *   url: "http://localhost:3000/",
 *   path: "/",
 *   label: "Home",
 *   device: "desktop",
 *   violations: [violation],
 *   runtimeErrorMessage: undefined
 * };
 * ```
 */
export type AxeResult = {
  readonly url: string;
  readonly path: string;
  readonly label: string;
  readonly device: ApexDevice;
  readonly violations: readonly AxeViolation[];
  readonly runtimeErrorMessage?: string;
};

/**
 * Complete accessibility audit summary containing metadata and results for all audited pages.
 * Provides a comprehensive overview of accessibility violations across the entire site.
 * 
 * @example
 * ```typescript
 * const summary: AxeSummary = {
 *   meta: {
 *     configPath: "./signaler.config.json",
 *     comboCount: 4,
 *     startedAt: "2024-01-01T00:00:00.000Z",
 *     completedAt: "2024-01-01T00:05:00.000Z",
 *     elapsedMs: 300000
 *   },
 *   results: [result1, result2]
 * };
 * ```
 */
export type AxeSummary = {
  readonly meta: {
    readonly configPath: string;
    readonly comboCount: number;
    readonly startedAt: string;
    readonly completedAt: string;
    readonly elapsedMs: number;
  };
  readonly results: readonly AxeResult[];
};
