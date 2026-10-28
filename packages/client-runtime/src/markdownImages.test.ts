import { managedPolicy } from "@t3tools/shared/managedPolicy";
import { afterEach, beforeEach, vi } from "vite-plus/test";

import { describe, expect, it } from "vite-plus/test";

import { classifyMarkdownImageSource } from "./markdownImages.js";

beforeEach(() => {
  vi.spyOn(managedPolicy, "allows").mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe("classifyMarkdownImageSource", () => {
  it.each([
    ["images/result.png", "/workspace/project", "/workspace/project/images/result.png"],
    [
      "images\\result.png",
      "C:\\Users\\dara\\project",
      "C:\\Users\\dara\\project\\images\\result.png",
    ],
    ["file:///workspace/project/image%20one.png", null, "/workspace/project/image one.png"],
    ["file://server/share/image.png", "\\\\server\\share", "\\\\server\\share\\image.png"],
  ])("maps %s to a workspace file", (source, workspaceRoot, path) => {
    expect(classifyMarkdownImageSource(source, workspaceRoot)).toEqual({
      _tag: "WorkspaceFile",
      path,
    });
  });

  it.each(["image.png", "javascript:alert(1)", "file://%"])(
    "blocks unsupported or unresolved source %s",
    (source) => {
      expect(classifyMarkdownImageSource(source)).toEqual({ _tag: "Blocked" });
    },
  );

  // Loading these makes Windows send the user's NTLM credentials to the named host.
  it.each([
    "file://attacker.test/share/cat.jpg",
    "\\\\attacker.test\\share\\cat.jpg",
    "/\\attacker.test\\share\\cat.jpg",
    "file:/%5Cattacker.test%5Cshare%5Ccat.jpg",
    "\\\\server\\other\\cat.jpg",
  ])("blocks network path %s outside the project", (source) => {
    expect(classifyMarkdownImageSource(source, "\\\\server\\share\\project")).toEqual({
      _tag: "Blocked",
    });
  });
});

it("should block https and protocol-relative images while keeping data, blob, loopback and workspace images under managed policy", () => {
  vi.mocked(managedPolicy.allows).mockReturnValue(false);

  const sources = [
    "https://attacker.example/image.png?secret=abc",
    "//attacker.example/image.png",
    "https://127.0.0.1.attacker.example/image.png",
    "data:image/png;base64,AAAA",
    "blob:https://app.t3.codes/image-id",
    "http://127.0.0.1:3773/image.png",
    "images/result.png",
  ];
  const results = sources.map((source) => classifyMarkdownImageSource(source, "/workspace"));

  expect(results.map((result) => result._tag)).toEqual([
    "Blocked",
    "Blocked",
    "Blocked",
    "Direct",
    "Direct",
    "Direct",
    "WorkspaceFile",
  ]);
});
