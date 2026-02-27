import path from "node:path";
import Database from "better-sqlite3";

export class SQLiteRepository {
	private filePath: string;
	private db: Database.Database;

	constructor() {
		this.filePath = path.resolve("data/database.sqlite");
		this.db = new Database(this.filePath);

		this.db.exec(`
            CREATE TABLE IF NOT EXISTS linked_users (
                plugin_user_id TEXT PRIMARY KEY,
                discord_id TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
        `);
	}

	public linkUser(pluginUserId: string, discordId: string): void {
		const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO linked_users (plugin_user_id, discord_id, created_at)
            VALUES (?, ?, ?)
        `);

		stmt.run(pluginUserId, discordId, Date.now());
	}

	public getDiscordIdByPluginUserId(pluginUserId: string): string | null {
		const stmt = this.db.prepare(`
            SELECT discord_id FROM linked_users WHERE plugin_user_id = ?
        `);

		const row = stmt.get(pluginUserId) as { discord_id: string } | undefined;
		return row?.discord_id ?? null;
	}

	public getPlatformsStatusByUserId(pluginUserId: string): {
		discord: boolean;
		telegram: boolean;
	} {
		const stmt = this.db.prepare(`
            SELECT discord_id FROM linked_users WHERE plugin_user_id = ?
        `);

		const row = stmt.get(pluginUserId) as { discord_id: string } | undefined;

		return {
			discord: !!row?.discord_id,
			telegram: false,
		};
	}
}
