import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SQLiteRepository } from "../../src/infra/SQLiteRepository.js";

describe("SQLiteRepository", () => {
	const testDbDir = path.resolve("data");
	const testDbPath = path.resolve("data/database.sqlite");
	let repo: SQLiteRepository;

	beforeEach(() => {
		// Ensure the data directory exists
		if (!fs.existsSync(testDbDir)) {
			fs.mkdirSync(testDbDir, { recursive: true });
		}
		// Remove the DB file if it exists to get a clean slate
		if (fs.existsSync(testDbPath)) {
			fs.unlinkSync(testDbPath);
		}
		repo = new SQLiteRepository();
	});

	afterEach(() => {
		// Clean up
		if (fs.existsSync(testDbPath)) {
			fs.unlinkSync(testDbPath);
		}
	});

	describe("linkUser", () => {
		it("links a plugin user to a Discord ID", () => {
			repo.linkUser("plugin-user-1", "discord-123");
			const discordId = repo.getDiscordIdByPluginUserId("plugin-user-1");
			expect(discordId).toBe("discord-123");
		});

		it("overwrites existing link on re-link", () => {
			repo.linkUser("plugin-user-1", "discord-123");
			repo.linkUser("plugin-user-1", "discord-456");
			const discordId = repo.getDiscordIdByPluginUserId("plugin-user-1");
			expect(discordId).toBe("discord-456");
		});
	});

	describe("getDiscordIdByPluginUserId", () => {
		it("returns null for unknown user", () => {
			const result = repo.getDiscordIdByPluginUserId("nonexistent");
			expect(result).toBeNull();
		});

		it("returns the correct Discord ID", () => {
			repo.linkUser("user-a", "discord-aaa");
			repo.linkUser("user-b", "discord-bbb");
			expect(repo.getDiscordIdByPluginUserId("user-a")).toBe("discord-aaa");
			expect(repo.getDiscordIdByPluginUserId("user-b")).toBe("discord-bbb");
		});
	});

	describe("getPlatformsStatusByUserId", () => {
		it("returns discord=false for unlinked user", () => {
			const status = repo.getPlatformsStatusByUserId("unknown");
			expect(status).toEqual({ discord: false, telegram: false });
		});

		it("returns discord=true for linked user", () => {
			repo.linkUser("user-linked", "discord-999");
			const status = repo.getPlatformsStatusByUserId("user-linked");
			expect(status).toEqual({ discord: true, telegram: false });
		});
	});
});
