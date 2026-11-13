import { describe, expect, it, vi } from "vite-plus/test";

import { type Method, serveWorker } from "./worker-rpc";

describe("Office worker method dispatch", () => {
  it.each(["toString", "constructor", "__proto__", "missing"])(
    "rejects [%s] as an unknown method instead of invoking an inherited property",
    async (method) => {
      const messages = new EventTarget();
      const postMessage = vi.fn();
      vi.useFakeTimers();
      vi.stubGlobal("self", {
        addEventListener: messages.addEventListener.bind(messages),
        postMessage,
      });

      try {
        serveWorker<{ echo: Method<string, string> }>({ echo: (input) => input });

        messages.dispatchEvent(
          new MessageEvent("message", { data: { id: 1, method, input: "hi" } }),
        );
        await vi.runAllTimersAsync();

        expect(postMessage).toHaveBeenCalledWith(
          { id: 1, ok: false, superseded: false, message: `Unknown method ${method}` },
          { transfer: [] },
        );
      } finally {
        vi.unstubAllGlobals();
        vi.useRealTimers();
      }
    },
  );

  it("returns [hi] when the registered echo method receives [hi]", async () => {
    const messages = new EventTarget();
    const postMessage = vi.fn();
    vi.useFakeTimers();
    vi.stubGlobal("self", {
      addEventListener: messages.addEventListener.bind(messages),
      postMessage,
    });

    try {
      serveWorker<{ echo: Method<string, string> }>({ echo: (input) => input });

      messages.dispatchEvent(
        new MessageEvent("message", { data: { id: 1, method: "echo", input: "hi" } }),
      );
      await vi.runAllTimersAsync();

      expect(postMessage).toHaveBeenCalledWith(
        { id: 1, ok: true, value: "hi", transferred: [] },
        { transfer: [] },
      );
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});
