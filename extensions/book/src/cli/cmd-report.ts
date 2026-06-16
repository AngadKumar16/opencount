import chalk from "chalk";
import type { Command } from "commander";
import { groupByMonth, printMonthlyReport } from "../reports.js";
import { openBookDb } from "../db.js";
import type { Transaction } from "../db.js";

export function registerReportCmd(book: Command): void {
  book
    .command("report")
    .description("Show monthly spending report")
    .option("--month <YYYY-MM>", "Specific month (default: current month)")
    .option("--last <n>", "Show last N months", "1")
    .option("--all-months", "Show all months with data")
    .action((opts: { month?: string; last: string; allMonths?: boolean }) => {
      const db  = openBookDb();
      const txs = db.prepare("SELECT * FROM oc_transactions ORDER BY date ASC").all() as Transaction[];

      if (txs.length === 0) {
        console.log(chalk.dim("\n  No transactions yet. Run:"));
        console.log(`    ${chalk.cyan("openclaw book import bank.csv")}`);
        console.log(`    ${chalk.cyan("openclaw book add")}\n`);
        return;
      }

      const byMonth = groupByMonth(txs);

      if (opts.allMonths) {
        for (const [month, monthTxs] of [...byMonth.entries()].sort()) {
          printMonthlyReport(month, monthTxs);
        }
        return;
      }

      if (opts.month) {
        const monthTxs = byMonth.get(opts.month);
        if (!monthTxs) {
          console.log(chalk.yellow(`  No data for ${opts.month}.`));
          const available = [...byMonth.keys()].sort();
          console.log(chalk.dim("  Available months: " + available.join(", ")));
          return;
        }
        printMonthlyReport(opts.month, monthTxs);
        return;
      }

      // Default: last N months
      const months = [...byMonth.keys()].sort().reverse().slice(0, Number(opts.last)).reverse();
      if (months.length === 0) {
        console.log(chalk.dim("  No data."));
        return;
      }
      for (const m of months) {
        printMonthlyReport(m, byMonth.get(m)!);
      }
    });
}
