import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import type { SQLiteRepository } from "../../src/infra/SQLiteRepository.js";
import { CallbackController } from "../../src/routes/CallbackRoute.js";
import { OAuthErrorHandler } from "../../src/routes/callbacks/OAuthErrorHandler.js";
import { OAuthSuccessHandler } from "../../src/routes/callbacks/OAuthSuccessHandler.js";
import type { DiscordIntegration } from "../../src/services/DiscordIntegration.js";
import type { InMemorySocket } from "../../src/websocket/infra/InMemorySocketConnections.js";

describe("CallbackController", () => {
	let controller: CallbackController;
	let mockInMemorySocket: InMemorySocket;
	let mockSqliteRepository: SQLiteRepository;
	let mockDiscordIntegration: DiscordIntegration;
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

		const oauthSuccessHandler = new OAuthSuccessHandler(
			mockInMemorySocket,
			mockSqliteRepository,
			mockDiscordIntegration,
		);
		const oauthErrorHandler = new OAuthErrorHandler(mockInMemorySocket);

		controller = new CallbackController(oauthSuccessHandler, oauthErrorHandler);
	});

	it("returns 400 when code and error are both missing", async () => {
		const req = { query: { state: "user1" } } as unknown as Request;
		await controller.execute(req, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when state is missing", async () => {
		const req = { query: { code: "abc123" } } as unknown as Request;
		await controller.execute(req, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when code has special characters", async () => {
		const req = {
			query: { code: "<script>alert(1)</script>", state: "user1" },
		} as unknown as Request;
		await controller.execute(req, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when state has special characters", async () => {
		const req = {
			query: { code: "abc123", state: "user;DROP TABLE" },
		} as unknown as Request;
		await controller.execute(req, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("links user and sends DM on valid OAuth callback", async () => {
		const req = {
			query: { code: "validcode123", state: "user42" },
		} as unknown as Request;
		vi.mocked(mockDiscordIntegration.exchangeOAuthCode).mockResolvedValue({
			discordId: "discord789",
			username: "testuser",
		});
		vi.mocked(mockInMemorySocket.getSocket).mockReturnValue(undefined);

		await controller.execute(req, res as Response);

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

	it("sends WS authComplete event when socket is connected", async () => {
		const req = {
			query: { code: "validcode123", state: "user42" },
		} as unknown as Request;
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

		await controller.execute(req, res as Response);

		expect(mockSocket.send).toHaveBeenCalledWith(
			JSON.stringify({
				type: "authComplete",
				provider: "discord",
				pluginUserId: "user42",
			}),
		);
	});

	it("returns 500 when OAuth exchange fails", async () => {
		const req = {
			query: { code: "validcode123", state: "user42" },
		} as unknown as Request;
		vi.mocked(mockDiscordIntegration.exchangeOAuthCode).mockRejectedValue(
			new Error("Token request failed"),
		);

		await controller.execute(req, res as Response);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ error: "OAuth failed" });
	});

	it("handles OAuth error response from Discord", async () => {
		const req = {
			query: {
				error: "access_denied",
				error_description: "The user denied the request",
				state: "user42",
			},
		} as unknown as Request;

		vi.mocked(mockInMemorySocket.getSocket).mockReturnValue(undefined);

		await controller.execute(req, res as Response);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: "OAuth authorization failed",
			details: "The user denied the request",
		});
	});

	it("sends WS authError event when Discord returns an error and socket is connected", async () => {
		const req = {
			query: {
				error: "access_denied",
				state: "user42",
			},
		} as unknown as Request;

		const mockSocket: Partial<WebSocket> = {
			readyState: WebSocket.OPEN,
			send: vi.fn(),
		};
		vi.mocked(mockInMemorySocket.getSocket).mockReturnValue(
			mockSocket as WebSocket,
		);

		await controller.execute(req, res as Response);

		expect(mockSocket.send).toHaveBeenCalledWith(
			JSON.stringify({
				type: "authError",
				provider: "discord",
				pluginUserId: "user42",
				error: "access_denied",
			}),
		);
	});

	it("handles OAuth error without description", async () => {
		const req = {
			query: {
				error: "access_denied",
				state: "user42",
			},
		} as unknown as Request;

		vi.mocked(mockInMemorySocket.getSocket).mockReturnValue(undefined);

		await controller.execute(req, res as Response);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: "OAuth authorization failed",
			details: "access_denied",
		});
	});
});
