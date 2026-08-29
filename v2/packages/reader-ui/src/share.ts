export async function shareReadingLocation(
  title: string,
  url: string,
): Promise<string> {
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title, url });
      return "Reading location shared";
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return "Reading link copied";
    }
    return "Copy the page address to share this location";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError"
      ? "Sharing cancelled"
      : error instanceof Error
        ? `Sharing failed: ${error.message}`
        : "Sharing failed";
  }
}
