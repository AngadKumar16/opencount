import chalk from "chalk";
import ora from "ora";
import type { Command } from "commander";
import { importCsv } from "../csv-import.js";
import { generateId, now, openBookDb } from "../db.js";

export function registerImportCmd(book: Command): void {
  book
    .command("import <file>")
    .description("Import transactions from a CSV bank export")
    .option("--account <name>", "Account name to tag these transactions")
    .option("--currency <code>", "Currency code (default: USD)", "USD")
    .option("--dry-run", "Parse the file but do not save")
    .action(async (file: string, opts: { account?: string; currency: string; dryRun?: boolean }) => {
      const spinner = ora(`Reading ${file}`).start();

      let result;
      try {
        result = importCsv(file);
        spinner.succeed(
          `Detected format: ${chalk.bold(result.formatName)} — ${result.totalRows} rows`,
        );
      } catch (err: unknown) {
        spinner.fail(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }

      if (result.transactions.length === 0) {
        console.log(chalk.yellow("  No valid transactions found."));
        return;
      }

      console.log(
        chalk.dim(
          `  Parsed ${result.transactions.length} transactions` +
          (result.skipped > 0 ? `, ${result.skipped} skipped` : ""),
        ),
      );

      if (opts.dryRun) {
        console.log(chalk.dim("  Dry run — nothing saved."));
        return;
      }

      const db    = openBookDb();
      const stmt  = db.prepare(`
        INSERT OR IGNORE INTO oc_transactions
          (id, date, amount, description, account, currency, source, source_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'csv', ?, ?, ?)
      `);

      const insert = db.transaction(() => {
        let inserted = 0;
        let dupes    = 0;
        for (const tx of result.transactions) {
          const id      = generateId();
          const ts      = now();
          const sourceId = `${tx.date}:${tx.amount}:${tx.description}`.slice(0, 200);
          const info    = stmt.run(
            id, tx.date, tx.amount, tx.description,
            opts.account ?? tx.account ?? null,
            opts.currency,
            sourceId, ts, ts,
          );
          if (info.changes > 0) inserted++;
          else dupes++;
        }
        return { inserted, dupes };
      });

      const spinner2 = ora("Saving to database…").start();
      const { inserted, dupes } = insert();
      spinner2.succeed(
        `Imported ${chalk.green.bold(String(inserted))} transactions` +
        (dupes > 0 ? chalk.dim(` (${dupes} duplicates skipped)`) : ""),
      );

      if (inserted > 0) {
        console.log(
          chalk.dim(`\n  Next: run `) +
          chalk.cyan("openclaw book categorize") +
          chalk.dim(" to auto-categorize with AI."),
        );
      }
    });
}
