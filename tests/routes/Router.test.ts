import type { Express } from "express";
import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQLiteRepository } from "../../src/infra/SQLiteRepository.js";
import { Router } from "../../src/routes/index.js";
import type { DiscordIntegration } from "../../src/services/DiscordIntegration.js";
import type { InMemorySocket } from "../../src/websocket/infra/InMemorySocketConnections.js";

describe("Router", () => {
	let mockSqliteRepository: SQLiteRepository;
	let mockInMemorySocket: InMemorySocket;
	let mockDiscordIntegration: DiscordIntegration;
	let app: Express;

	beforeEach(() => {
		mockSqliteRepository = {
			linkUser: vi.fn(),
			getDiscordIdByPluginUserId: vi.fn(),
			getPlatformsStatusByUserId: vi.fn(),
		} as unknown as SQLiteRepository;

		mockInMemorySocket = {
			getSocket: vi.fn(),
		} as unknown as InMemorySocket;

		mockDiscordIntegration = {
			exchangeOAuthCode: vi.fn(),
			sendDirectMessage: vi.fn(),
		} as unknown as DiscordIntegration;

		app = express();
	});

	it("registers GET /callback route", () => {
		const getSpy = vi.spyOn(app, "get");

		const router = new Router(
			mockSqliteRepository,
			mockInMemorySocket,
			mockDiscordIntegration,
		);
		router.registerRoutes(app);

		expect(getSpy).toHaveBeenCalledWith("/callback", expect.any(Function));
	});

	it("registers POST /notify route", () => {
		const postSpy = vi.spyOn(app, "post");

		const router = new Router(
			mockSqliteRepository,
			mockInMemorySocket,
			mockDiscordIntegration,
		);
		router.registerRoutes(app);

		expect(postSpy).toHaveBeenCalledWith(
			"/notify",
			expect.any(Function),
			expect.any(Function),
		);
	});

	it("registers GET /platforms route", () => {
		const getSpy = vi.spyOn(app, "get");

		const router = new Router(
			mockSqliteRepository,
			mockInMemorySocket,
			mockDiscordIntegration,
		);
		router.registerRoutes(app);

		expect(getSpy).toHaveBeenCalledWith("/platforms", expect.any(Function));
	});
});
