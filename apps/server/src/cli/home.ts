import { appIdentity } from "@t3tools/shared/appIdentity";
import {
  officialHomeDir,
  resolveHomeFromHost,
  saveHomeChoice,
  type HomeChoice,
  type HomeChoiceHost,
  type HomeSource,
} from "@t3tools/shared/homeChoice";

const SHARES_DATA_NOTE = "Shares data with official T3 Code.";

const USAGE = `Usage: ${appIdentity.cliCommand} home [use-official | use-isolated]`;

/**
 * `home` for the show/choose commands. Returns the text to print and the exit code;
 * `use-*` persists the choice first. Starts no server and touches no T3 home.
 */
export function runHomeCommand(
  args: ReadonlyArray<string>,
  host: HomeChoiceHost,
): { readonly output: string; readonly exitCode: number } {
  const [subcommand, ...extra] = args;
  if (extra.length > 0) return { output: USAGE, exitCode: 1 };
  if (subcommand === undefined) return { output: describeHome(host), exitCode: 0 };
  if (subcommand === "use-official") return { output: choose(host, "official"), exitCode: 0 };
  if (subcommand === "use-isolated") return { output: choose(host, "isolated"), exitCode: 0 };
  return { output: USAGE, exitCode: 1 };
}

function describeHome(host: HomeChoiceHost): string {
  const home = resolveHomeFromHost(host);
  const lines = [`Home: ${home.dir}`, `Source: ${describeSource(home.source, host)}`];
  if (home.dir === officialHomeDir(host.homeDirectory)) lines.push(SHARES_DATA_NOTE);
  return lines.join("\n");
}

function describeSource(source: HomeSource, host: HomeChoiceHost): string {
  if (source === "env") return `environment (${host.identity.homeEnvVar})`;
  if (source === "choice") return "saved choice";
  return "default";
}

function choose(host: HomeChoiceHost, choice: HomeChoice): string {
  saveHomeChoice(host, choice);
  const home = resolveHomeFromHost(host);
  const lines = [`Saved. ${appIdentity.baseName} will use ${home.dir} from its next start.`];
  if (home.source === "env") {
    lines.push(
      `${host.identity.homeEnvVar} is set and wins over the saved choice. Unset it to apply the choice.`,
    );
  }
  if (choice === "official") lines.push("", ...OFFICIAL_HOME_WARNINGS);
  lines.push(
    `Quit ${appIdentity.baseName} and any ${appIdentity.cliCommand} server, then start it again.`,
  );
  return lines.join("\n");
}

const OFFICIAL_HOME_WARNINGS = [
  "Warning: this shares every project, thread and setting with official T3 Code.",
  "- Only one server can use a home at a time: quit the other app before starting this one.",
  "- A build that is older than the data may fail to open it, and a database upgrade by one app can lock the other out.",
  "- Provider sign-ins live in each app's own profile, so you may need to sign in again.",
  `Undo with: ${appIdentity.cliCommand} home use-isolated`,
];
