import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import type { SQLiteRepository } from "../../src/infra/SQLiteRepository.js";
import { CallbackController } from "../../src/routes/CallbackRoute.js";
import type { DiscordIntegration } from "../../src/services/DiscordIntegration.js";
import type { InMemorySocket } from "../../src/websocket/infra/InMemorySocketConnections.js";

describe("CallbackController", () => {
	let controller: CallbackController;
	let mockInMemorySocket: InMemorySocket;
	let mockSqliteRepository: SQLiteRepository;
	let mockDiscordIntegration: DiscordIntegration;
	let req: Partial<Request>;
	let res: Partial<Response>;

	beforeEach(() => {
		mockInMemorySocket = {
			getSocket: vi.fn(),
		} as unknown as InMemorySocket;

		mockSqliteRepository = {
			linkUser: vi.fn(),
		} as unknown as SQLiteRepository;

		mockDiscordIntegration = {
			exchangeOAuthCode: vi.fn(),
			sendDirectMessage: vi.fn(),
		} as unknown as DiscordIntegration;

		res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
		};

		controller = new CallbackController(
			mockInMemorySocket,
			mockSqliteRepository,
			mockDiscordIntegration,
		);
	});

	it("returns 400 when code is missing", async () => {
		req = { query: { state: "user1" } };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when state is missing", async () => {
		req = { query: { code: "abc123" } };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when code has special characters", async () => {
		req = { query: { code: "<script>alert(1)</script>", state: "user1" } };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when state has special characters", async () => {
		req = { query: { code: "abc123", state: "user;DROP TABLE" } };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("links user and sends DM on valid OAuth callback", async () => {
		req = { query: { code: "validcode123", state: "user42" } };
		vi.mocked(mockDiscordIntegration.exchangeOAuthCode).mockResolvedValue({
			discordId: "discord789",
			username: "testuser",
		});
		vi.mocked(mockInMemorySocket.getSocket).mockReturnValue(undefined);

		await controller.execute(req as Request, res as Response);

		expect(mockDiscordIntegration.exchangeOAuthCode).toHaveBeenCalledWith(
			"validcode123",
		);
		expect(mockSqliteRepository.linkUser).toHaveBeenCalledWith(
			"user42",
			"discord789",
		);
		expect(mockDiscordIntegration.sendDirectMessage).toHaveBeenCalledWith({
			userId: "discord789",
			message: "✅ Your FFXIV plugin has been successfully linked!",
		});
		expect(res.json).toHaveBeenCalledWith({
			message: "Account linked! You can close this window.",
		});
	});

	it("sends WS event when socket is connected", async () => {
		req = { query: { code: "validcode123", state: "user42" } };
		vi.mocked(mockDiscordIntegration.exchangeOAuthCode).mockResolvedValue({
			discordId: "discord789",
			username: "testuser",
		});

		const mockSocket: Partial<WebSocket> = {
			readyState: WebSocket.OPEN,
			send: vi.fn(),
		};
		vi.mocked(mockInMemorySocket.getSocket).mockReturnValue(
			mockSocket as WebSocket,
		);

		await controller.execute(req as Request, res as Response);

		expect(mockSocket.send).toHaveBeenCalledWith(
			JSON.stringify({
				type: "authComplete",
				provider: "discord",
				pluginUserId: "user42",
			}),
		);
	});

	it("returns 500 when OAuth exchange fails", async () => {
		req = { query: { code: "validcode123", state: "user42" } };
		vi.mocked(mockDiscordIntegration.exchangeOAuthCode).mockRejectedValue(
			new Error("Token request failed"),
		);

		await controller.execute(req as Request, res as Response);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ error: "OAuth failed" });
	});
});
