import type { Session } from "electron";

export function createSafeGitHubAuthorization() {
  return new SafeGitHubAuthorization();
}

class SafeGitHubAuthorization {
  private session: Session | undefined;

  install(session: Session): void {
    if (this.session === session) return;
    // The updater owns this isolated session for the app lifetime. Electron keeps one
    // listener per event, so repeated checks must not replace another listener:
    // https://www.electronjs.org/docs/latest/api/web-request#webrequestonbeforesendheadersfilter-listener
    session.webRequest.onBeforeSendHeaders((details, callback) => {
      const requestHeaders = restrictGitHubAuthorization(details.url, details.requestHeaders);
      callback({ requestHeaders });
    });
    this.session = session;
  }
}

export function restrictGitHubAuthorization(
  destination: string,
  headers: Record<string, string>,
): Record<string, string> {
  const url = new URL(destination);
  const isReleaseRead =
    url.pathname === "/repos/rakutenanalytics/t3code/releases/latest" ||
    /^\/repos\/rakutenanalytics\/t3code\/releases\/assets\/\d+$/.test(url.pathname);
  if (url.origin === "https://api.github.com" && isReleaseRead) return headers;

  const restrictedHeaders = { ...headers };
  for (const name of Object.keys(restrictedHeaders)) {
    if (name.toLowerCase() === "authorization") delete restrictedHeaders[name];
  }
  return restrictedHeaders;
}
