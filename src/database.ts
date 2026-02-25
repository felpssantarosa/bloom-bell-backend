import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "data.sqlite");
const db = new Database(dbPath);

db.exec(`
	CREATE TABLE IF NOT EXISTS linked_users (
		plugin_user_id TEXT PRIMARY KEY,
		discord_id TEXT NOT NULL,
		created_at INTEGER NOT NULL
	);
`);

export function linkUser(pluginUserId: string, discordId: string): void {
	const stmt = db.prepare(`
		INSERT OR REPLACE INTO linked_users (plugin_user_id, discord_id, created_at)
		VALUES (?, ?, ?)
	`);
	stmt.run(pluginUserId, discordId, Date.now());
}

export function getDiscordId(pluginUserId: string): string | null {
	const stmt = db.prepare(`
		SELECT discord_id FROM linked_users WHERE plugin_user_id = ?
	`);
	const row = stmt.get(pluginUserId) as { discord_id: string } | undefined;
	return row?.discord_id ?? null;
}
