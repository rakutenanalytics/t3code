import { allowsRemoteContentUrl } from "@t3tools/shared/remoteContent";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import { SOURCE_CONTROL_MEDIA_ASSET, type EnvironmentId } from "@t3tools/contracts";
import type { FilePreviewItem } from "../../components/FilePreviewModal.types";

export interface PullRequestMediaLocation {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
}

/** Keep the original resource identity so previewers can resolve and renew its capability. */
export function pullRequestMediaSource(url: string, location: PullRequestMediaLocation | null) {
  if (!allowsRemoteContentUrl(url)) return null;
  const fetchUrl = sourceControlClients.mediaUrl(url)?.fetchUrl;
  return location && fetchUrl
    ? {
        environmentId: location.environmentId,
        resource: { _tag: SOURCE_CONTROL_MEDIA_ASSET, cwd: location.cwd, url: fetchUrl },
      }
    : { uri: url };
}

export function pullRequestImageSource(
  url: string,
  location: PullRequestMediaLocation | null,
): FilePreviewItem | null {
  const source = pullRequestMediaSource(url, location);
  if (source === null) return null;
  return { kind: "image", ...source };
}
