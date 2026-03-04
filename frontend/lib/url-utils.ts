/** Allow only relative /api/ paths or explicit http/https URLs to prevent javascript: injection. */
export function isSafeDownloadUrl(url: string): boolean {
  return (
    url.startsWith("/api/") ||
    url.startsWith("https://") ||
    url.startsWith("http://")
  );
}
