import chalk from "chalk";
import readline from "node:readline/promises";
import Table from "cli-table3";
import type { Command } from "commander";
import { generateId, now, openBookDb } from "../db.js";
import type { BookUser } from "../db.js";

export function registerTeamCmd(book: Command): void {
  const team = book
    .command("team")
    .description("Manage team members for this workspace");

  team
    .command("list")
    .description("List all team members")
    .action(() => {
      const db    = openBookDb();
      const users = db.prepare("SELECT * FROM oc_users ORDER BY created_at").all() as BookUser[];

      if (users.length === 0) {
        console.log(chalk.dim("\n  No team members yet. Run: ") + chalk.cyan("openclaw book team add\n"));
        return;
      }

      const table = new Table({
        head: [chalk.bold("Name"), chalk.bold("Email"), chalk.bold("Role"), chalk.bold("Added")],
        style: { head: [] },
      });
      for (const u of users) {
        table.push([u.name, u.email ?? "—", u.role, u.created_at.slice(0, 10)]);
      }
      console.log("\n" + table.toString());
    });

  team
    .command("add [email]")
    .description("Add a team member")
    .option("--name <name>", "Member name")
    .option("--role <role>", "Role: admin | member | viewer", "member")
    .action(async (email?: string, opts?: { name?: string; role: string }) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      const resolvedEmail = email ?? (await rl.question(chalk.cyan("Email: ")));
      const resolvedName  = opts?.name ?? (await rl.question(chalk.cyan("Name: ")));
      rl.close();

      if (!resolvedName.trim()) {
        console.error(chalk.red("  Name is required."));
        process.exit(1);
      }

      const db = openBookDb();
      const ts = now();
      try {
        db.prepare(
          "INSERT INTO oc_users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)",
        ).run(generateId(), resolvedName.trim(), resolvedEmail || null, opts?.role ?? "member", ts);
        console.log(chalk.green(`\n  ✓ Added ${resolvedName} to the team.`));
      } catch {
        console.error(chalk.red("  A user with that email already exists."));
        process.exit(1);
      }
    });

  team
    .command("remove <email>")
    .description("Remove a team member by email")
    .action((email: string) => {
      const db   = openBookDb();
      const info = db.prepare("DELETE FROM oc_users WHERE email = ?").run(email);
      if (info.changes === 0) {
        console.log(chalk.yellow(`  No member found with email: ${email}`));
      } else {
        console.log(chalk.green(`  ✓ Removed ${email} from the team.`));
      }
    });
}
