import { describe, expect, it } from "vite-plus/test";
import { compareDependencyPackages } from "./dependency-lockfile.ts";

describe("dependency baseline comparison", () => {
  it("reports every added version and its previous versions", () => {
    const previous = { "@scope/tool@1.0.0": "old" };
    const current = {
      "@scope/tool@1.0.0": "old",
      "@scope/tool@2.0.0": "new",
      "@scope/tool@3.0.0": "newer",
      "other@1.0.0": "added",
    };

    const changes = compareDependencyPackages(previous, current);

    expect(changes).toEqual([
      { id: "@scope/tool@2.0.0", kind: "added", previousVersions: ["1.0.0"] },
      { id: "@scope/tool@3.0.0", kind: "added", previousVersions: ["1.0.0"] },
      { id: "other@1.0.0", kind: "added", previousVersions: [] },
    ]);
  });

  it("reports changed resolution metadata for an unchanged version", () => {
    const previous = { "tool@1.0.0": "original-resolution" };
    const current = { "tool@1.0.0": "changed-resolution" };

    const changes = compareDependencyPackages(previous, current);

    expect(changes).toEqual([{ id: "tool@1.0.0", kind: "changed", previousVersions: ["1.0.0"] }]);
  });

  it("omits unchanged and removed versions", () => {
    const previous = { "tool@1.0.0": "same", "removed@1.0.0": "removed" };
    const current = { "tool@1.0.0": "same" };

    const changes = compareDependencyPackages(previous, current);

    expect(changes).toEqual([]);
  });
});
