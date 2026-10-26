/**
 * Every ACP agent spawns `t3 acp-mcp-bridge` while opening its session, and terminal-fallback
 * agents run `t3 acp-mcp-call` per tool call, so their startup sits on first-message latency.
 * Both dispatch here before the full CLI module graph (seconds of evaluation) loads; everything
 * else defers to the real CLI in ./binCli.ts.
 */
import { isEntrypoint } from "./entrypoint.ts";

if (
  isEntrypoint({
    moduleUrl: import.meta.url,
    entryPath: process.argv[1],
    runtimeMain: import.meta.main,
  })
) {
  const command = process.argv[2];
  // Guard sockets before either dispatch path can load outbound-capable modules.
  const { ignoreMacosTypeOfServiceEinval } = await import("./outboundHttp.ts");
  ignoreMacosTypeOfServiceEinval();
  if (command === "managed-policy") {
    const { managedPolicy } = await import("@t3tools/shared/managedPolicy");
    process.stdout.write(`${JSON.stringify(managedPolicy.policy)}\n`);
  } else if (command === "app-identity") {
    const { appIdentity } = await import("@t3tools/shared/appIdentity");
    process.stdout.write(`${JSON.stringify(appIdentity)}\n`);
  } else if (command === "home") {
    // Offline and instant: choosing a home must not need a server or the CLI module graph.
    const { runHomeCommand } = await import("./cli/home.ts");
    const { appIdentity } = await import("@t3tools/shared/appIdentity");
    const os = await import("node:os");
    const { output, exitCode } = runHomeCommand(process.argv.slice(3), {
      identity: appIdentity,
      platform: os.platform(),
      homeDirectory: os.homedir(),
      env: process.env,
    });
    (exitCode === 0 ? process.stdout : process.stderr).write(`${output}\n`);
    process.exitCode = exitCode;
  } else if (command === "acp-mcp-bridge" || command === "acp-mcp-call") {
    const { runAcpMcpCliFastPath } = await import("./mcp/AcpMcpStdioBridge.ts");
    await runAcpMcpCliFastPath(command, process.argv.slice(3));
  } else {
    // Before anything reads stdin: the desktop app's Windows launcher starts
    // the CLI without one. Never for the fast paths, whose stdin is a pipe.
    const { attachConsoleStdin } = await import("./cli/consoleStdin.ts");
    attachConsoleStdin();
    const { runCli } = await import("./binCli.ts");
    runCli();
  }
}
