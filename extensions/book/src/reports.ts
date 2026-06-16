/**
 * Monthly report generator with ASCII bar charts for the terminal.
 */
import chalk from "chalk";
import Table from "cli-table3";
import type { Transaction } from "./db.js";

const GREEN   = chalk.hex("#10B981");
const DIMMED  = chalk.dim;
const BOLD    = chalk.bold;
const RED     = chalk.red;

function formatAmount(n: number, currency = "USD"): string {
  const sign = n >= 0 ? "+" : "";
  const formatted = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === "USD" ? "$" : currency;
  return n >= 0
    ? GREEN(`${sign}${symbol}${formatted}`)
    : RED(`-${symbol}${formatted}`);
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Group transactions by YYYY-MM */
export function groupByMonth(txs: Transaction[]): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const key = tx.date.slice(0, 7);
    const bucket = map.get(key) ?? [];
    bucket.push(tx);
    map.set(key, bucket);
  }
  return map;
}

/** ASCII bar chart — each bar is proportional to spend */
export function renderBarChart(
  data: Array<{ label: string; value: number }>,
  maxWidth = 30,
): string {
  if (data.length === 0) return "";
  const maxVal = Math.max(...data.map((d) => Math.abs(d.value)));
  const lines: string[] = [];
  for (const { label, value } of data) {
    const pct = maxVal > 0 ? Math.abs(value) / maxVal : 0;
    const bars = Math.round(pct * maxWidth);
    const bar = "█".repeat(bars) + "░".repeat(maxWidth - bars);
    const pctStr = `${(pct * 100).toFixed(0)}%`.padStart(4);
    lines.push(
      `${BOLD(label.padEnd(20).slice(0, 20))} ${GREEN(bar)} ${DIMMED(pctStr)}`,
    );
  }
  return lines.join("\n");
}

type CategorySummary = { category: string; total: number; count: number };

/** Print the monthly expense/income report to stdout. */
export function printMonthlyReport(month: string, txs: Transaction[]): void {
  const expenses = txs.filter((t) => t.amount < 0);
  const income   = txs.filter((t) => t.amount >= 0);

  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome   = income.reduce((s, t) => s + t.amount, 0);
  const net           = totalIncome + totalExpenses;

  // --- Header ---
  console.log("\n" + BOLD(GREEN("━".repeat(56))));
  console.log(BOLD(`  opencount  📊  ${month} Report`));
  console.log(BOLD(GREEN("━".repeat(56))));

  // --- Summary row ---
  const summaryTable = new Table({
    style: { head: [], border: [] },
    chars: {
      top: "─", "top-mid": "┬", "top-left": "┌", "top-right": "┐",
      bottom: "─", "bottom-mid": "┴", "bottom-left": "└", "bottom-right": "┘",
      left: "│", "left-mid": "├", mid: "─", "mid-mid": "┼",
      right: "│", "right-mid": "┤", middle: "│",
    },
  });
  summaryTable.push(
    [BOLD("Income"), BOLD("Expenses"), BOLD("Net")],
    [formatAmount(totalIncome), formatAmount(totalExpenses), formatAmount(net)],
  );
  console.log(summaryTable.toString());

  if (expenses.length === 0) {
    console.log(DIMMED("  No expenses this month.\n"));
    return;
  }

  // --- By category ---
  const catMap = new Map<string, CategorySummary>();
  for (const tx of expenses) {
    const cat = tx.category ?? "Uncategorized";
    const prev = catMap.get(cat) ?? { category: cat, total: 0, count: 0 };
    catMap.set(cat, { ...prev, total: prev.total + tx.amount, count: prev.count + 1 });
  }
  const categories: CategorySummary[] = [...catMap.values()].sort((a, b) => a.total - b.total);

  const catTable = new Table({
    head: [BOLD("Category"), BOLD("Transactions"), BOLD("Total")],
    style: { head: [] },
    chars: {
      top: "─", "top-mid": "┬", "top-left": "┌", "top-right": "┐",
      bottom: "─", "bottom-mid": "┴", "bottom-left": "└", "bottom-right": "┘",
      left: "│", "left-mid": "├", mid: "─", "mid-mid": "┼",
      right: "│", "right-mid": "┤", middle: "│",
    },
  });
  for (const { category, total, count } of categories) {
    catTable.push([category, String(count), formatAmount(total)]);
  }
  console.log("\n" + BOLD("  Spending by Category"));
  console.log(catTable.toString());

  // --- Bar chart ---
  const chartData = categories.map((c) => ({ label: c.category, value: c.total }));
  console.log("\n" + BOLD("  Breakdown"));
  console.log(renderBarChart(chartData));
  console.log();
}

/** Print a recent transactions table. */
export function printTransactionList(
  txs: Transaction[],
  limit = 20,
): void {
  const table = new Table({
    head: [BOLD("Date"), BOLD("Description"), BOLD("Category"), BOLD("Amount")],
    style: { head: [] },
    colWidths: [12, 36, 20, 14],
    wordWrap: true,
  });

  for (const tx of txs.slice(0, limit)) {
    table.push([
      formatDate(tx.date),
      tx.description.slice(0, 34),
      tx.category ?? DIMMED("uncategorized"),
      formatAmount(tx.amount, tx.currency),
    ]);
  }
  console.log(table.toString());

  if (txs.length > limit) {
    console.log(DIMMED(`  … and ${txs.length - limit} more. Use --all to show everything.`));
  }
}
