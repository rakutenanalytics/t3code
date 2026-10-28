import { describe, expect, it } from "vite-plus/test";
import { registryReview } from "./dependency-registry.ts";

describe("dependency release age", () => {
  it("accepts a release at 4320 minutes despite changed lifecycle or maintainer metadata", () => {
    const metadata = {
      time: { "2.0.0": "2026-10-01T00:00:00Z" },
      versions: {
        "1.0.0": { maintainers: [{ name: "previous" }] },
        "2.0.0": {
          maintainers: [{ name: "current" }],
          scripts: { install: "node download.js" },
        },
      },
    };

    const review = registryReview(
      metadata,
      "2.0.0",
      ["1.0.0"],
      4320,
      Date.parse("2026-10-04T00:00:00Z"),
    );

    expect(review.requiresAgeReview).toBe(false);
  });

  it("requires an exception for a release at 4319 minutes", () => {
    const metadata = { time: { "1.0.0": "2026-10-01T00:00:00Z" } };

    const review = registryReview(metadata, "1.0.0", [], 4320, Date.parse("2026-10-03T23:59:00Z"));

    expect(review.requiresAgeReview).toBe(true);
    expect(review.ageMinutes).toBe(4319);
  });

  it("keeps a release with missing publication time unresolved", () => {
    const review = registryReview({}, "1.0.0", [], 4320, Date.parse("2026-10-04T00:00:00Z"));

    expect(review.requiresAgeReview).toBe(true);
    expect(review.ageMinutes).toBeNull();
  });
});
