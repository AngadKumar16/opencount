/**
 * opencount `book` CLI — bookkeeping commands built on openclaw.
 *
 * Commands:
 *   book import <file>        Import transactions from CSV
 *   book add                  Manually add a transaction
 *   book categorize           AI-categorize uncategorized transactions
 *   book report [--month]     Monthly spending report
 *   book list                 List recent transactions
 *   book team                 Manage team members
 *   book config               View / set opencount config
 */
import type { Command } from "commander";
import { registerImportCmd }     from "./cmd-import.js";
import { registerAddCmd }        from "./cmd-add.js";
import { registerCategorizeCmd } from "./cmd-categorize.js";
import { registerReportCmd }     from "./cmd-report.js";
import { registerListCmd }       from "./cmd-list.js";
import { registerTeamCmd }       from "./cmd-team.js";
import { registerConfigCmd }     from "./cmd-config.js";

export function registerBookCli(program: Command): void {
  const book = program
    .command("book")
    .description("opencount — AI-powered bookkeeping and expense tracking")
    .addHelpText(
      "after",
      `
Examples:
  $ openclaw book import bank.csv
  $ openclaw book categorize
  $ openclaw book report --month 2024-01
  $ openclaw book team add jane@example.com
  $ openclaw book config set ai.model gpt-4o-mini
`,
    );

  registerImportCmd(book);
  registerAddCmd(book);
  registerCategorizeCmd(book);
  registerReportCmd(book);
  registerListCmd(book);
  registerTeamCmd(book);
  registerConfigCmd(book);
}
