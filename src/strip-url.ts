/**
 * Remove query string and hash fragment from a URL string.
 */
export function stripUrl(input: string): string {
  try {
    const url: URL = new URL(input);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    const withoutHash: string = (input.split("#")[0] ?? input).trim();
    const withoutQuery: string = (withoutHash.split("?")[0] ?? withoutHash).trim();
    return withoutQuery;
  }
}
