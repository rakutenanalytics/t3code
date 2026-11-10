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
  type ArtifactHostBaseline,
} from "./artifact-host-review.ts";
import { jsonFile, root } from "./repository.ts";

const { telemetryDomains } = jsonFile<ArtifactHostBaseline>("security/artifact-hosts.json");

describe("artifact host review", () => {
  it("trusts telemetry hosts only under listed provider SDK path prefixes", () => {
    const fixture = createScannerFixture();
    const paths = [
      "node_modules/@cursor/sdk/dist/index.js",
      "release/node_modules/@statsig/client-core/index.js",
      "node_modules/@cursor/sdk-other/index.js",
      "node_modules/new-package/index.js",
      "apps/telemetry.js",
    ];
    for (const file of paths) fixture.write(file, 'fetch("https://statsigapi.net")');
    fixture.write("node_modules/@cursor/sdk/dist/t3.js", '"https://app.t3.codes"');

    try {
      const scan = fixture.scan();

      expect(scan.status).toBe(1);
      expect(fixture.report().unapprovedForbiddenLiterals).toMatchObject([
        { host: "app.t3.codes", file: "node_modules/@cursor/sdk/dist/t3.js" },
        { host: "statsigapi.net", file: "apps/telemetry.js" },
        { host: "statsigapi.net", file: "node_modules/@cursor/sdk-other/index.js" },
        { host: "statsigapi.net", file: "node_modules/new-package/index.js" },
      ]);
      expect(fixture.report().unapprovedForbiddenLiterals).toHaveLength(4);
    } finally {
      fixture.cleanup();
    }
  });

  it("accepts reviewed T3 literals while rejecting new hosts and changed contexts", () => {
    const fixture = createScannerFixture();
    fixture.write("main.js", 'const origin = "https://app.t3.codes";');

    try {
      const acceptance = fixture.scan("--accept-gated-literals", "--note", "Reviewed navigation");

      expect(acceptance.status, acceptance.stderr).toBe(0);
      expect(fixture.scan().status).toBe(0);
      expect(fixture.report().unapprovedForbiddenLiterals).toEqual([]);

      fixture.write("main.js", 'fetch("https://app.t3.codes");');
      fixture.write("new.js", '"https://new.t3.codes"');

      expect(fixture.scan().status).toBe(1);
      expect(fixture.report().unapprovedForbiddenLiterals).toMatchObject([
        { host: "app.t3.codes", file: "main.js" },
        { host: "new.t3.codes", file: "new.js" },
      ]);
    } finally {
      fixture.cleanup();
    }
  });

  it("preserves literal approvals when only eight-character chunk suffixes change", () => {
    const fixture = createScannerFixture();
    fixture.write(
      "main-abcdefgh.js",
      'import "./runtime-12345678.js"; const origin = "https://app.t3.codes";',
    );

    try {
      expect(fixture.scan("--accept-gated-literals", "--note", "Reviewed navigation").status).toBe(
        0,
      );
      NodeFS.unlinkSync(NodePath.join(fixture.bundle, "main-abcdefgh.js"));
      fixture.write(
        "main-87654321.js",
        'import "./runtime-aB_cD-12.js"; const origin = "https://app.t3.codes";',
      );

      const rebuilt = fixture.scan();

      expect(rebuilt.status, rebuilt.stderr).toBe(0);
      expect(fixture.report().unapprovedForbiddenLiterals).toEqual([]);
    } finally {
      fixture.cleanup();
    }
  });

  it("accepts the reviewed privacy link across clipped chunk hashes but rejects a new fetch", () => {
    const fixture = createScannerFixture();
    const callSite = (utilsHash: string, indexHash: string) =>
      `import{_n as e,gn as t,hn as n,pn as r}from"./utils-${utilsHash}.js";import{e_ as i,vt as a,zh as o}from"./index-${indexHash}.js";var s=\`https://t3.codes/privacy-policy\`;function c(e){return e!==\`separate\`}function l(e,t=\`repository\`){return e}`;
    fixture.write("SettingsPanels.logic-BGZgqFpo.js", callSite("B4I4LKis", "BSreM5r9"));

    try {
      expect(
        fixture.scan("--accept-gated-literals", "--note", "Reviewed privacy anchor").status,
      ).toBe(0);
      NodeFS.unlinkSync(NodePath.join(fixture.bundle, "SettingsPanels.logic-BGZgqFpo.js"));
      fixture.write("SettingsPanels.logic-cjmgdhuu.js", callSite("NNsfeux9", "CeBtHz1J"));

      const rebuilt = fixture.scan();

      expect(rebuilt.status, rebuilt.stderr).toBe(0);
      expect(fixture.report().unapprovedForbiddenLiterals).toEqual([]);
      const expectedPrivacyHash =
        "11fae3d2ee4f1b3dcab5a6c068af9b65c626c46abaeec72c75159134a1fe7f8c";
      for (const [utilsHash, indexHash] of [
        ["B4I4LKis", "BSreM5r9"],
        ["NNsfeux9", "CeBtHz1J"],
      ] as const) {
        const hosts = collectArtifactHosts([
          { file: "SettingsPanels.logic-cjmgdhuu.js", text: callSite(utilsHash, indexHash) },
        ]);
        expect(hosts[0]!.literals[0]!.contextSha256).toBe(expectedPrivacyHash);
      }

      fixture.write(
        "SettingsPanels.logic-cjmgdhuu.js",
        callSite("NNsfeux9", "CeBtHz1J").replace(
          "s=`https://t3.codes/privacy-policy`",
          "s=fetch(`https://t3.codes/privacy-policy`)",
        ),
      );

      expect(fixture.scan().status).toBe(1);
      expect(fixture.report().unapprovedForbiddenLiterals).toMatchObject([
        { host: "t3.codes", file: "SettingsPanels.logic-cjmgdhuu.js" },
      ]);
    } finally {
      fixture.cleanup();
    }
  });

  it.each([
    { boundary: "left", specifier: "./utils", quote: '"' },
    { boundary: "right", specifier: "./utils", quote: '"' },
    { boundary: "left", specifier: "../x/utils", quote: "'" },
    { boundary: "right", specifier: "../x/utils", quote: "`" },
  ])(
    "accepts a hosted-origin literal when [$specifier] clips the [$boundary] context boundary",
    ({ boundary, specifier, quote }) => {
      const chunk = (hash: string) => `import ${quote}${specifier}-${hash}.js${quote};`;
      const literal = 'const origin="https://app.t3.codes";';
      const callSite = (hash: string) => {
        if (boundary === "left") return chunk(hash) + " ".repeat(50) + literal;
        return literal + " ".repeat(55) + chunk(hash);
      };
      const original = collectArtifactHosts([
        { file: "utils-12345678.js", text: callSite("abcdefgh") },
      ]);
      const ledger = [
        { host: "app.t3.codes", ...original[0]!.literals[0]!, note: "Reviewed hosted origin" },
      ];

      const rebuilt = collectArtifactHosts([
        { file: "utils-87654321.js", text: callSite("aB_cD-12") },
      ]);

      expect(reviewArtifactHosts(rebuilt, [], ledger).passed).toBe(true);
    },
  );

  it("rejects a changed absolute URL path when its eight-letter suffix clips the right boundary", () => {
    const callSite = (suffix: string) =>
      `const u="https://t3.codes/${"x".repeat(71)}-${suffix}.js";`;
    const original = collectArtifactHosts([{ file: "main.js", text: callSite("download") }]);
    const ledger = [
      { host: "t3.codes", ...original[0]!.literals[0]!, note: "Reviewed download link" },
    ];

    const changed = collectArtifactHosts([{ file: "main.js", text: callSite("tracking") }]);
    const review = reviewArtifactHosts(changed, [], ledger);

    expect(reviewArtifactHosts(original, [], ledger).passed).toBe(true);
    expect(changed[0]!.literals[0]!.contextSha256).not.toBe(ledger[0]!.contextSha256);
    expect(review.passed).toBe(false);
    expect(review.unapprovedForbiddenLiterals).toHaveLength(1);
  });

  it("rejects a changed executable property when its eight-letter name clips the left boundary", () => {
    const callSite = (method: string) =>
      `globalThis.${method}.js(${" ".repeat(64)}"https://app.t3.codes");`;
    const original = collectArtifactHosts([{ file: "main.js", text: callSite("noopnoop") }]);
    const ledger = [
      { host: "app.t3.codes", ...original[0]!.literals[0]!, note: "Reviewed inert method" },
    ];

    const changed = collectArtifactHosts([{ file: "main.js", text: callSite("sendData") }]);
    const review = reviewArtifactHosts(changed, [], ledger);

    expect(reviewArtifactHosts(original, [], ledger).passed).toBe(true);
    expect(changed[0]!.literals[0]!.contextSha256).not.toBe(ledger[0]!.contextSha256);
    expect(review.passed).toBe(false);
    expect(review.unapprovedForbiddenLiterals).toHaveLength(1);
  });

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

  it("should pass for trusted provider hosts without individual baseline entries", () => {
    const hosts = collectArtifactHosts(
      [
        {
          file: "provider.js",
          text: '"https://api.anthropic.com"; "https://api.openai.com"; "https://custom-provider.company.net"; "https://docs.statsig.com"; "https://docs.sentry.io"',
        },
      ],
      telemetryDomains,
    );

    const review = reviewArtifactHosts(hosts, [], [], telemetryDomains);

    expect(review.passed).toBe(true);
    expect(review.forbiddenHosts).toEqual([]);
  });

  it("should fail for telemetry hosts from the baseline denylist", () => {
    const hosts = collectArtifactHosts(
      [
        {
          file: "vendor.js",
          text: '"https://api.statsigcdn.com/v1"; endpoint: "events.statsigapi.net"',
        },
      ],
      telemetryDomains,
    );

    const review = reviewArtifactHosts(hosts, [], [], telemetryDomains);

    expect(review.passed).toBe(false);
    expect(review.forbiddenHosts.map((entry) => entry.host)).toEqual([
      "api.statsigcdn.com",
      "events.statsigapi.net",
    ]);
  });

  it("should fail for a forbidden host even when that host is reviewed", () => {
    const hosts = collectArtifactHosts([
      {
        file: "main.js",
        text: '"https://t3.codes"; "https://relay.t3.codes"; "https://ingest.t3.codes"; "https://us.i.posthog.com"; "telemetry.t3.codes"',
      },
    ]);
    const baseline = hosts.map(({ host, category }) => ({ host, category }));

    const review = reviewArtifactHosts(hosts, baseline, [], telemetryDomains);

    expect(review.unreviewedHosts).toEqual([]);
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

  it("should accept a matching gated fingerprint after unrelated content and chunk filename changes", () => {
    const hosts = collectArtifactHosts([
      { file: "main-abcdefgh.js", text: '"https://app.t3.codes";' + " ".repeat(100) },
    ]);
    const ledger = [{ host: "app.t3.codes", ...hosts[0]!.literals[0]!, note: "t3Connect denied" }];

    const rebuilt = collectArtifactHosts([
      {
        file: "main-12345678.js",
        text: '"https://app.t3.codes";' + " ".repeat(100) + 'console.log("unrelated")',
      },
    ]);

    const review = reviewArtifactHosts(rebuilt, [], ledger);

    expect(review.passed).toBe(true);
    expect(review.forbiddenHosts.map((entry) => entry.host)).toEqual(["app.t3.codes"]);
    expect(review.unapprovedForbiddenLiterals).toEqual([]);
  });

  it("should fail when a gated literal's nearby call site changes its fingerprint", () => {
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

  describe("gated literal fingerprint", () => {
    const fingerprintOf = (text: string) =>
      collectArtifactHosts([{ file: "runtime-abcdefgh.js", text }])[0]!.literals[0]!.contextSha256;

    it("produces the same fingerprint for the same literal when only the safe build version changes from 0.1.0-safe.0 to 0.1.0-safe.7", () => {
      const callSite = (version: string) =>
        `Kf=\`${version}\`,qf=\`https://t3.codes/download\`,Jf=\`state\``;

      expect(fingerprintOf(callSite("0.1.0-safe.7"))).toBe(fingerprintOf(callSite("0.1.0-safe.0")));
    });

    it("produces a different fingerprint when the surrounding code changes beyond the version string", () => {
      const original = 'v="0.1.0-safe.0",u="https://t3.codes/download"';
      const changed = 'v="0.1.0-safe.0",u=fetch("https://t3.codes/download")';

      expect(fingerprintOf(changed)).not.toBe(fingerprintOf(original));
    });
  });

  it("should exit 0 for an unknown host and write it into unreviewedHosts", () => {
    const work = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "artifact-report-"));
    const bundle = NodePath.join(work, "bundle");
    const report = NodePath.join(work, "host-report.json");
    NodeFS.mkdirSync(bundle);
    NodeFS.writeFileSync(
      NodePath.join(bundle, "main.js"),
      '"https://new.customer-service.net"; "https://café.customer-service.net"',
    );

    try {
      const scan = NodeChildProcess.spawnSync(
        process.execPath,
        ["scripts/safe/artifact-scan.ts", bundle, "--report", report],
        { cwd: root, encoding: "utf8" },
      );

      expect(scan.status).toBe(0);
      expect(scan.stdout).toContain("NEW new.customer-service.net");
      const recorded = JSON.parse(NodeFS.readFileSync(report, "utf8"));
      expect(recorded.passed).toBe(true);
      expect(recorded.unreviewedHosts.map((entry: { host: string }) => entry.host)).toEqual([
        "new.customer-service.net",
        "xn--caf-dma.customer-service.net",
      ]);
    } finally {
      NodeFS.rmSync(work, { recursive: true, force: true });
    }
  });
});

function createScannerFixture() {
  const work = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "artifact-ledger-"));
  const bundle = NodePath.join(work, "bundle");
  const baseline = NodePath.join(work, "baseline.json");
  const report = NodePath.join(work, "report.json");
  NodeFS.writeFileSync(
    baseline,
    JSON.stringify({
      justification: "Test fixture",
      seenHosts: [],
      telemetryDomains,
      providerSdkPaths: ["node_modules/@cursor/sdk/", "node_modules/@statsig/"],
      gatedLiterals: [],
    }),
  );
  const write = (file: string, text: string) => {
    const destination = NodePath.join(bundle, file);
    NodeFS.mkdirSync(NodePath.dirname(destination), { recursive: true });
    NodeFS.writeFileSync(destination, text);
  };
  const identityJson = NodeFS.readFileSync("security/app-identity.json", "utf8");
  const policy = `const policy = {allow:["remoteAccess.network"]};const identity = ${identityJson};`;
  write("apps/desktop/dist-electron/main.cjs", policy);
  write("apps/desktop/dist-electron/preload.cjs", policy);
  write("apps/server/dist/bin.mjs", policy);
  write("apps/server/dist/client/assets/runtime.js", policy);

  return {
    bundle,
    write,
    scan: (...args: string[]) =>
      NodeChildProcess.spawnSync(
        process.execPath,
        [
          "scripts/safe/artifact-scan.ts",
          bundle,
          "--baseline",
          baseline,
          "--report",
          report,
          ...args,
        ],
        { cwd: root, encoding: "utf8" },
      ),
    report: () =>
      JSON.parse(NodeFS.readFileSync(report, "utf8")) as {
        unapprovedForbiddenLiterals: { host: string; file: string }[];
      },
    cleanup: () => NodeFS.rmSync(work, { recursive: true, force: true }),
  };
}
