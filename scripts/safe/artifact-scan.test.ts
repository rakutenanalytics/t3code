// @effect-diagnostics nodeBuiltinImport:off - CLI fixtures inspect local text without executing bundled code.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { describe, expect, it } from "vite-plus/test";
import {
  collectArtifactHosts,
  reviewArtifactHosts,
  formatArtifactHostReview,
} from "./artifact-host-review.ts";
import { root } from "./repository.ts";

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

    expect(hosts).toMatchObject([
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

  it("should accept a forbidden literal when its host, file and fingerprint match the gated ledger", () => {
    const hosts = collectArtifactHosts([{ file: "main.js", text: '"https://app.t3.codes"' }]);
    const ledger = [{ host: "app.t3.codes", ...hosts[0]!.literals[0]!, note: "t3Connect denied" }];

    const review = reviewArtifactHosts(hosts, [], ledger);

    expect(review.passed).toBe(true);
    expect(review.forbiddenHosts.map((entry) => entry.host)).toEqual(["app.t3.codes"]);
    expect(review.unapprovedForbiddenLiterals).toEqual([]);
  });

  it("should fail when a gated literal's file content changes its fingerprint", () => {
    const original = collectArtifactHosts([{ file: "main.js", text: '"https://app.t3.codes"' }]);
    const ledger = [
      { host: "app.t3.codes", ...original[0]!.literals[0]!, note: "t3Connect denied" },
    ];
    const changed = collectArtifactHosts([
      { file: "main.js", text: 'fetch("https://app.t3.codes")' },
    ]);

    const review = reviewArtifactHosts(changed, [], ledger);

    expect(review.passed).toBe(false);
    expect(review.unapprovedForbiddenLiterals).toMatchObject([
      { host: "app.t3.codes", file: "main.js" },
    ]);
  });

  it("should fail for a new forbidden host beside an accepted gated literal", () => {
    const hosts = collectArtifactHosts([
      { file: "main.js", text: '"https://app.t3.codes"' },
      { file: "vendor.js", text: '"https://ingest.t3.codes"' },
    ]);
    const ledger = [{ host: "app.t3.codes", ...hosts[0]!.literals[0]!, note: "t3Connect denied" }];

    const review = reviewArtifactHosts(hosts, [], ledger);

    expect(review.passed).toBe(false);
    expect(review.unapprovedForbiddenLiterals).toMatchObject([
      { host: "ingest.t3.codes", file: "vendor.js" },
    ]);
  });

  it("should exit 0 in report-only mode and record new hosts and forbidden literals that normally exit 1", () => {
    const work = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "artifact-report-"));
    const bundle = NodePath.join(work, "bundle");
    const report = NodePath.join(work, "host-report.json");
    NodeFS.mkdirSync(bundle);
    NodeFS.writeFileSync(
      NodePath.join(bundle, "main.js"),
      '"https://new.example.com"; "https://ingest.t3.codes"',
    );

    try {
      const strict = NodeChildProcess.spawnSync(
        process.execPath,
        ["scripts/safe/artifact-scan.ts", bundle],
        { cwd: root, encoding: "utf8" },
      );
      const reportOnly = NodeChildProcess.spawnSync(
        process.execPath,
        ["scripts/safe/artifact-scan.ts", bundle, "--report-only", "--report", report],
        { cwd: root, encoding: "utf8" },
      );

      expect(strict.status).toBe(1);
      expect(reportOnly.status).toBe(0);
      expect(reportOnly.stdout).toContain("REPORT ONLY");
      expect(reportOnly.stdout).toContain("NEW new.example.com");
      expect(reportOnly.stdout).toContain("FORBIDDEN ingest.t3.codes");
      const recorded = JSON.parse(NodeFS.readFileSync(report, "utf8"));
      expect(recorded.passed).toBe(false);
      expect(recorded.newHosts).toMatchObject([{ host: "new.example.com" }]);
      expect(recorded.unapprovedForbiddenLiterals).toMatchObject([
        { host: "ingest.t3.codes", file: "main.js" },
      ]);
    } finally {
      NodeFS.rmSync(work, { recursive: true, force: true });
    }
  });
});
