export type LinksCheckStatus = "pass" | "inconclusive" | "fail";

export function evaluateLinksCheckStatus(params: {
  readonly discoveredCount: number;
  readonly brokenCount: number;
}): LinksCheckStatus {
  if (params.discoveredCount === 0) {
    return "inconclusive";
  }
  if (params.brokenCount > 0) {
    return "fail";
  }
  return "pass";
}

export function formatLinksCheckStatusLabel(status: LinksCheckStatus): string {
  switch (status) {
    case "pass":
      return "pass";
    case "inconclusive":
      return "inconclusive (0 URLs discovered)";
    case "fail":
      return "fail (broken links)";
  }
}
