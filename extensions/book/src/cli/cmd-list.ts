import chalk from "chalk";
import type { Command } from "commander";
import { printTransactionList } from "../reports.js";
import { openBookDb } from "../db.js";
import type { Transaction } from "../db.js";

export function registerListCmd(book: Command): void {
  book
    .command("list")
    .description("List recent transactions")
    .option("--limit <n>", "Number of transactions to show", "30")
    .option("--all", "Show all transactions")
    .option("--category <name>", "Filter by category")
    .option("--month <YYYY-MM>", "Filter by month")
    .option("--uncategorized", "Show only uncategorized transactions")
    .action((opts: {
      limit: string;
      all?: boolean;
      category?: string;
      month?: string;
      uncategorized?: boolean;
    }) => {
      const db = openBookDb();
      let sql  = "SELECT * FROM oc_transactions WHERE 1=1";
      const params: unknown[] = [];

      if (opts.uncategorized) {
        sql += " AND category IS NULL";
      } else if (opts.category) {
        sql += " AND category = ?";
        params.push(opts.category);
      }

      if (opts.month) {
        sql += " AND date LIKE ?";
        params.push(`${opts.month}%`);
      }

      sql += " ORDER BY date DESC";
      if (!opts.all) {
        sql += " LIMIT ?";
        params.push(Number(opts.limit));
      }

      const txs = db.prepare(sql).all(...params) as Transaction[];

      if (txs.length === 0) {
        console.log(chalk.dim("  No transactions match your filter."));
        return;
      }

      console.log(chalk.bold(`\n  Showing ${txs.length} transactions\n`));
      printTransactionList(txs, opts.all ? txs.length : Number(opts.limit));
    });
}
