import { beforeEach, describe, expect, it, vi } from "vitest";
import type WebSocket from "ws";
import type { SQLiteRepository } from "../../src/infra/SQLiteRepository.js";
import { RegisterUserService } from "../../src/websocket/services/RegisterUserService.js";
import type { RegisterWebSocketService } from "../../src/websocket/services/RegisterWebSocketConnection.js";

describe("RegisterUserService", () => {
	let service: RegisterUserService;
	let mockRegisterWsService: RegisterWebSocketService;
	let mockSqliteRepository: SQLiteRepository;
	let mockWs: WebSocket;

	beforeEach(() => {
		mockRegisterWsService = {
			execute: vi.fn(),
		} as unknown as RegisterWebSocketService;

		mockSqliteRepository = {
			getDiscordIdByPluginUserId: vi.fn(),
		} as unknown as SQLiteRepository;

		mockWs = {
			send: vi.fn(),
		} as unknown as WebSocket;

		service = new RegisterUserService(
			mockRegisterWsService,
			mockSqliteRepository,
		);
	});

	it("registers the websocket connection", () => {
		vi.mocked(mockSqliteRepository.getDiscordIdByPluginUserId).mockReturnValue(
			null,
		);
		service.execute("user1", mockWs);
		expect(mockRegisterWsService.execute).toHaveBeenCalledWith("user1", mockWs);
	});

	it("sends authAlreadyLinked when Discord is linked", () => {
		vi.mocked(mockSqliteRepository.getDiscordIdByPluginUserId).mockReturnValue(
			"discord123",
		);
		service.execute("user1", mockWs);
		expect(mockWs.send).toHaveBeenCalledWith(
			JSON.stringify({
				type: "authAlreadyLinked",
				provider: "discord",
				userId: "user1",
			}),
		);
	});

	it("does NOT send authAlreadyLinked when not linked", () => {
		vi.mocked(mockSqliteRepository.getDiscordIdByPluginUserId).mockReturnValue(
			null,
		);
		service.execute("user1", mockWs);
		expect(mockWs.send).not.toHaveBeenCalled();
	});
});
