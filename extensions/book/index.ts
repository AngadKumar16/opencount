/**
 * opencount — bookkeeping and expense tracking plugin for openclaw.
 *
 * Registers the `book` command group on the openclaw CLI:
 *   openclaw book import <file>
 *   openclaw book categorize
 *   openclaw book report
 *   openclaw book list
 *   openclaw book team
 *   openclaw book config
 */
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const BOOK_CLI_DESCRIPTOR = {
  name: "book",
  description: "opencount — AI-powered bookkeeping and expense tracking",
  hasSubcommands: true,
};

export default definePluginEntry({
  id: "book",
  name: "opencount",
  description: "AI-powered bookkeeping, expense categorization, and financial insights",
  register(api) {
    api.registerCli(
      async ({ program }) => {
        const { registerBookCli } = await import("./src/cli/book-cli.js");
        registerBookCli(program);
      },
      { commands: ["book"], descriptors: [BOOK_CLI_DESCRIPTOR] },
    );
  },
});
