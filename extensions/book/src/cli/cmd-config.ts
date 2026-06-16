import chalk from "chalk";
import Table from "cli-table3";
import type { Command } from "commander";
import { getBookConfig, resolveBookDbPath, setBookConfig } from "../db.js";

const KNOWN_KEYS: Record<string, string> = {
  "ai.provider":  "AI provider: openai | ollama | gemini | openai-compatible",
  "ai.model":     "Model name (e.g. gpt-4o-mini, llama3.2, gemini-1.5-flash)",
  "ai.key":       "API key for the AI provider",
  "ai.baseUrl":   "Custom base URL for OpenAI-compatible endpoints",
  "default.currency": "Default currency code (e.g. USD, EUR)",
  "default.user": "Your name for tagging manual transactions",
};

export function registerConfigCmd(book: Command): void {
  const config = book
    .command("config")
    .description("View and set opencount configuration");

  config
    .command("list")
    .description("Show all configuration values")
    .action(() => {
      console.log(chalk.dim(`\n  Database: ${resolveBookDbPath()}\n`));
      const table = new Table({
        head: [chalk.bold("Key"), chalk.bold("Value"), chalk.bold("Description")],
        style: { head: [] },
        colWidths: [22, 30, 40],
        wordWrap: true,
      });
      for (const [key, desc] of Object.entries(KNOWN_KEYS)) {
        const val = getBookConfig(key);
        const display = key === "ai.key" && val ? val.slice(0, 8) + "…" : (val ?? chalk.dim("not set"));
        table.push([key, display, chalk.dim(desc)]);
      }
      console.log(table.toString());
    });

  config
    .command("set <key> <value>")
    .description("Set a config value (e.g. set ai.model gpt-4o-mini)")
    .action((key: string, value: string) => {
      if (!Object.keys(KNOWN_KEYS).includes(key)) {
        console.log(chalk.yellow(`  Warning: unknown key "${key}". Saving anyway.`));
      }
      setBookConfig(key, value);
      const display = key === "ai.key" ? value.slice(0, 8) + "…" : value;
      console.log(chalk.green(`  ✓ ${key} = ${display}`));
    });

  config
    .command("get <key>")
    .description("Get a config value")
    .action((key: string) => {
      const val = getBookConfig(key);
      if (val === null) {
        console.log(chalk.dim(`  ${key}: not set`));
      } else {
        const display = key === "ai.key" ? val.slice(0, 8) + "…" : val;
        console.log(`  ${key}: ${chalk.green(display)}`);
      }
    });

  // Make bare `book config` show list
  config.action(() => {
    config.help();
  });
}
