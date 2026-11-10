import { managedPolicy } from "@t3tools/shared/managedPolicy";
import { beforeEach, afterEach, vi } from "vite-plus/test";
import { describe, expect, it } from "vite-plus/test";
import { EnvironmentId } from "@t3tools/contracts";
import { filePreviewGallery } from "../../lib/filePreviewGallery";
import { pullRequestImageSource } from "./pullRequestMediaSource";

beforeEach(() => {
  vi.spyOn(managedPolicy, "allows").mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

const location = { environmentId: EnvironmentId.make("test"), cwd: "/repo" };
const url = "https://github.com/user-attachments/assets/abc-123";

describe("PR media previews", () => {
  it("keeps every gallery image resolvable and the tapped image appears only once", () => {
    const first = pullRequestImageSource(url, location);
    const second = pullRequestImageSource(`${url}-second`, location);
    if (first === null || second === null) throw new Error("Expected allowed image sources");
    const selected = { ...second, sourceIdentifier: "tapped" };
    const gallery = filePreviewGallery(selected, [first, second]);
    expect(gallery).toEqual([first, selected]);
    expect(gallery.every((item) => "resource" in item)).toBe(true);
  });
});

it("should return no image preview source for an external URL when remoteContent is denied", () => {
  vi.mocked(managedPolicy.allows).mockReturnValue(false);

  const source = pullRequestImageSource("https://external.example/image.png", null);

  expect(source).toBeNull();
});
