import fs from "node:fs";
import type { Server } from "node:http";
import path from "node:path";
import express from "express";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { SQLiteRepository } from "../../src/infra/SQLiteRepository.js";
import { Router } from "../../src/routes/index.js";
import type { DiscordIntegration } from "../../src/services/DiscordIntegration.js";
import { InMemorySocket } from "../../src/websocket/infra/InMemorySocketConnections.js";

vi.mock("../../src/services/DotEnvParser.js", () => ({
	dotenvConfig: {
		DISCORD_CLIENT_ID: "test-id",
		DISCORD_CLIENT_SECRET: "test-secret",
		DISCORD_BOT_TOKEN: "test-token",
		REDIRECT_URI: "http://localhost:3333/callback",
		PORT: "3333",
		WS_PORT: "3334",
		ALLOWED_ORIGINS: "",
	},
}));

describe("HTTP Integration Tests", () => {
	let app: express.Express;
	let server: Server;
	let repo: SQLiteRepository;
	let inMemorySocket: InMemorySocket;
	let mockDiscord: DiscordIntegration;
	const TEST_PORT = 9877;
	const dbPath = path.resolve("data/test-integration.sqlite");

	beforeAll(() => {
		const dataDir = path.resolve("data");
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}
	});

	beforeEach(async () => {
		if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

		repo = new SQLiteRepository(dbPath);
		inMemorySocket = new InMemorySocket();
		mockDiscord = {
			exchangeOAuthCode: vi.fn(),
			sendDirectMessage: vi.fn(),
			initialize: vi.fn(),
		} as unknown as DiscordIntegration;

		app = express();
		app.use(express.json({ limit: "16kb" }));

		const router = new Router(repo, inMemorySocket, mockDiscord);
		router.registerRoutes(app);

		server = await new Promise<Server>((resolve) => {
			const s = app.listen(TEST_PORT, () => resolve(s));
		});
	});

	afterEach(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
	});

	const baseUrl = `http://localhost:${TEST_PORT}`;

	describe("GET /platforms", () => {
		it("returns 400 for missing userId", async () => {
			const res = await fetch(`${baseUrl}/platforms`);
			expect(res.status).toBe(400);

			const body = await res.json();
			expect(body.error).toBe("Invalid request parameters");
		});

		it("returns 400 for invalid userId with special chars", async () => {
			const res = await fetch(
				`${baseUrl}/platforms?userId=${encodeURIComponent("<script>")}`,
			);
			expect(res.status).toBe(400);
		});

		it("returns discord:false for unlinked user", async () => {
			const res = await fetch(`${baseUrl}/platforms?userId=testuser1`);
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.platforms).toEqual({ discord: false, telegram: false });
		});

		it("returns discord:true for linked user", async () => {
			repo.linkUser("testuser1", "discord123");

			const res = await fetch(`${baseUrl}/platforms?userId=testuser1`);
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.platforms).toEqual({ discord: true, telegram: false });
		});
	});

	describe("POST /notify", () => {
		it("returns 400 for empty body", async () => {
			const res = await fetch(`${baseUrl}/notify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});

		it("returns 400 for invalid pluginUserId", async () => {
			const res = await fetch(`${baseUrl}/notify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pluginUserId: "<script>alert(1)</script>" }),
			});
			expect(res.status).toBe(400);
		});

		it("returns 404 for unlinked user", async () => {
			const res = await fetch(`${baseUrl}/notify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pluginUserId: "unknownuser" }),
			});
			expect(res.status).toBe(404);

			const body = await res.json();
			expect(body.error).toBe("User not linked to Discord");
		});

		it("sends notification for linked user when party is full", async () => {
			repo.linkUser("user1", "discord456");
			vi.mocked(mockDiscord.sendDirectMessage).mockResolvedValue(undefined);

			const res = await fetch(`${baseUrl}/notify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					pluginUserId: "user1",
					partySize: 8,
					maxSize: 8,
				}),
			});
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.status).toBe("Notification sent");
			expect(mockDiscord.sendDirectMessage).toHaveBeenCalledWith({
				userId: "discord456",
				message: "🎉 Your party is full! Time to queue!",
			});
		});

		it("returns 'Party not full yet' when partySize < maxSize", async () => {
			repo.linkUser("user1", "discord456");

			const res = await fetch(`${baseUrl}/notify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					pluginUserId: "user1",
					partySize: 3,
					maxSize: 8,
				}),
			});
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.status).toBe("Party not full yet");
			expect(mockDiscord.sendDirectMessage).not.toHaveBeenCalled();
		});
	});

	describe("GET /callback", () => {
		it("returns 400 for missing query params", async () => {
			const res = await fetch(`${baseUrl}/callback`);
			expect(res.status).toBe(400);
		});

		it("returns 400 for invalid code format", async () => {
			const res = await fetch(
				`${baseUrl}/callback?code=${encodeURIComponent("<script>")}&state=user1`,
			);
			expect(res.status).toBe(400);
		});

		it("links user on successful OAuth flow", async () => {
			vi.mocked(mockDiscord.exchangeOAuthCode).mockResolvedValue({
				discordId: "disc789",
				username: "player123",
			});
			vi.mocked(mockDiscord.sendDirectMessage).mockResolvedValue(undefined);

			const res = await fetch(
				`${baseUrl}/callback?code=validcode123&state=user42`,
			);
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.message).toBe("Account linked! You can close this window.");

			const discordId = repo.getDiscordIdByPluginUserId("user42");
			expect(discordId).toBe("disc789");
		});

		it("returns 500 when OAuth fails", async () => {
			vi.mocked(mockDiscord.exchangeOAuthCode).mockRejectedValue(
				new Error("OAuth error"),
			);

			const res = await fetch(
				`${baseUrl}/callback?code=validcode123&state=user42`,
			);
			expect(res.status).toBe(500);

			const body = await res.json();
			expect(body.error).toBe("OAuth failed");
		});
	});

	describe("Body size limit", () => {
		it("rejects payloads exceeding 16kb", async () => {
			const largeBody = { pluginUserId: "user1", data: "x".repeat(20000) };
			const res = await fetch(`${baseUrl}/notify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(largeBody),
			});

			expect(res.status).toBe(413);
		});
	});
});
