import { describe, expect, it } from "vite-plus/test";
import {
  collectArtifactHosts,
  reviewArtifactHosts,
  formatArtifactHostReview,
} from "./artifact-host-review.ts";

describe("artifact host review", () => {
  it("should group multiple URLs and literal hosts into one categorized host with a sample file", () => {
    const files = [
      {
        file: "vendor.js",
        text: '"https://www.w3.org/2000/svg"; "http://www.w3.org/1999/xhtml"; host: "www.w3.org"; "account.updated"',
      },
      { file: "client.js", text: '"https://www.w3.org/TR/SVG2/"' },
    ];

    const hosts = collectArtifactHosts(files);

    expect(hosts).toEqual([
      { host: "www.w3.org", category: "schema/namespace", sampleFile: "vendor.js", fileCount: 2 },
    ]);
  });

  it("should fail for a new host and pass after that host is reviewed", () => {
    const hosts = collectArtifactHosts([{ file: "vendor.js", text: '"https://example.com/api"' }]);

    const unreviewed = reviewArtifactHosts(hosts, []);
    const reviewed = reviewArtifactHosts(hosts, [
      { host: "example.com", category: "unexpected/other" },
    ]);

    expect(unreviewed.newHosts.map((entry) => entry.host)).toEqual(["example.com"]);
    expect(unreviewed.passed).toBe(false);
    expect(reviewed.newHosts).toEqual([]);
    expect(reviewed.passed).toBe(true);
  });

  it("should fail for a forbidden host even when that host is reviewed", () => {
    const hosts = collectArtifactHosts([
      {
        file: "main.js",
        text: '"https://t3.codes"; "https://relay.t3.codes"; "https://ingest.t3.codes"; "https://us.i.posthog.com"; "telemetry.t3.codes"',
      },
    ]);
    const baseline = hosts.map(({ host, category }) => ({ host, category }));

    const review = reviewArtifactHosts(hosts, baseline);

    expect(review.newHosts).toEqual([]);
    expect(review.forbiddenHosts.map((entry) => entry.host)).toEqual([
      "ingest.t3.codes",
      "relay.t3.codes",
      "t3.codes",
      "telemetry.t3.codes",
      "us.i.posthog.com",
    ]);
    expect(review.passed).toBe(false);
  });

  it("should list only new hosts and count hosts omitted by the output cap", () => {
    const hosts = collectArtifactHosts([
      {
        file: "main.js",
        text: '"https://reviewed.example.com"; "https://a.example.com"; "https://b.example.com"',
      },
    ]);
    const review = reviewArtifactHosts(hosts, [
      { host: "reviewed.example.com", category: "unexpected/other" },
    ]);

    const output = formatArtifactHostReview(hosts, review, 1);

    expect(output).toContain("3 unique hosts; 2 NEW; 0 forbidden");
    expect(output).toContain("NEW a.example.com");
    expect(output).toContain("1 additional NEW host(s) omitted");
    expect(output).not.toContain("reviewed.example.com");
    expect(output).not.toContain("b.example.com");
  });
});
