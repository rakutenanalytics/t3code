import { Suspense } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { render } from "../../../test/render";
import { MermaidDiagram } from "./MermaidDiagram";

vi.mock(import("pele/lazy"), () => ({
  detectType: () => "flowchart" as const,
  load: async () => true,
  mount: (container, _source, options) => {
    const svg = String.raw`<svg>
      <rect style="fill:url(https://diagram.invalid/pixel);stroke:red" filter="url(https://diagram.invalid/filter)" fill="url(#local)" />
      <rect class="escaped" style="fill:u\72l(https://diagram.invalid/escaped)" />
      <rect class="image-set" style="background-image:image-set('https://diagram.invalid/image' 1x)" />
    </svg>`;
    container.append(options!.sanitize!(svg));
    return {
      result: undefined,
      source: _source,
      error: undefined,
      zoom: undefined,
      update: () => {},
      refresh: () => {},
      destroy: () => container.replaceChildren(),
    };
  },
}));

describe("diagram remote content policy", () => {
  it.each(["flowchart LR; A-->B", "flowchart LR; A[$$x$$]-->B"])(
    "removes external CSS URLs, escaped URLs and image-set while preserving stroke:red and fill:url(#local) for [%s]",
    async (source) => {
      await using screen = await render(
        <Suspense fallback="Loading diagram">
          <MermaidDiagram source={source} onExpand={() => {}} />
        </Suspense>,
      );

      await expect.element(screen.getByRole("button", { name: "Expand diagram" })).toBeVisible();

      const style = screen.container.querySelector("rect")?.getAttribute("style");
      expect(style).not.toContain("https://diagram.invalid");
      expect(style).toContain("stroke:red");
      expect(screen.container.querySelector("rect")?.getAttribute("filter")).toBe("none");
      expect(screen.container.querySelector("rect")?.getAttribute("fill")).toBe("url(#local)");
      expect(screen.container.querySelector(".escaped")?.hasAttribute("style")).toBe(false);
      expect(screen.container.querySelector(".image-set")?.hasAttribute("style")).toBe(false);
    },
  );
});
