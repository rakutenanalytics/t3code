import { managedPolicy } from "./managedPolicy.ts";

export function allowsRemoteContentUrl(source: string): boolean {
  if (managedPolicy.allows("remoteContent")) return true;
  if (/^(?:data:|blob:)/i.test(source)) return true;

  try {
    const url = new URL(source, "https://remote-content.invalid");
    const isLoopback =
      url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    return isLoopback && (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}
