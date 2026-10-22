import { managedPolicy } from "@t3tools/shared/managedPolicy";
import { afterEach, beforeEach, vi } from "vite-plus/test";

import { describe, expect, it } from "vite-plus/test";

import { classifyMarkdownImageSource, markdownImageSourceFragment } from "./markdownImages.js";

beforeEach(() => {
  vi.spyOn(managedPolicy, "allows").mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe("classifyMarkdownImageSource", () => {
  it.each([
    "https://example.com/image.png",
    "HTTP://example.com/image.png",
    "data:image/png;base64,AAAA",
    "blob:https://app.t3.codes/image-id",
    "//cdn.example.com/image.png",
  ])("keeps %s directly loadable", (uri) => {
    expect(classifyMarkdownImageSource(uri, "/workspace/project")).toEqual({
      _tag: "Direct",
      uri,
    });
  });

  it.each([
    ["images/result.png", "/workspace/project", "/workspace/project/images/result.png"],
    ["./images/result.png", "/workspace/project", "/workspace/project/./images/result.png"],
    [
      "images/result.png",
      "C:\\Users\\dara\\project",
      "C:\\Users\\dara\\project\\images\\result.png",
    ],
    [
      "images\\result.png",
      "C:\\Users\\dara\\project",
      "C:\\Users\\dara\\project\\images\\result.png",
    ],
    ["/workspace/project/image.png", null, "/workspace/project/image.png"],
    ["/C:/Users/dara/project/image.png", null, "C:/Users/dara/project/image.png"],
    ["C:/Users/dara/project/image.png", null, "C:/Users/dara/project/image.png"],
    ["\\\\server\\share\\image.png", null, "\\\\server\\share\\image.png"],
    ["file:///workspace/project/image%20one.png", null, "/workspace/project/image one.png"],
    ["file:///C:/Users/dara/project/image.png", null, "C:/Users/dara/project/image.png"],
    ["file://localhost/C:/Users/dara/project/image.png", null, "C:/Users/dara/project/image.png"],
    ["file://server/share/image.png", null, "\\\\server\\share\\image.png"],
  ])("maps %s to a workspace file", (source, workspaceRoot, path) => {
    expect(classifyMarkdownImageSource(source, workspaceRoot)).toEqual({
      _tag: "WorkspaceFile",
      path,
    });
  });

  it.each([
    null,
    "",
    "#image",
    "?image=1",
    "image.png",
    "~/image.png",
    "javascript:alert(1)",
    "ftp://example.com/image.png",
    "content://media/image/1",
    "custom:image.png",
    "file://%",
  ])("blocks unsupported or unresolved source %s", (source) => {
    expect(classifyMarkdownImageSource(source)).toEqual({ _tag: "Blocked" });
  });
});

describe("markdownImageSourceFragment", () => {
  it.each([
    ["<icons.svg?version=2#logo>", "#logo"],
    ["icons.svg?version=2", ""],
  ])("extracts %s as %s", (source, fragment) => {
    expect(markdownImageSourceFragment(source)).toBe(fragment);
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
