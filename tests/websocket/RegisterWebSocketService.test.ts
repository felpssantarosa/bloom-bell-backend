import { beforeEach, describe, expect, it, vi } from "vitest";
import type WebSocket from "ws";
import type { InMemorySocket } from "../../src/websocket/infra/InMemorySocketConnections.js";
import type { ClosedWebSocketHandlerService } from "../../src/websocket/services/ClosedWebSocketHandlerService.js";
import { RegisterWebSocketService } from "../../src/websocket/services/RegisterWebSocketConnection.js";

describe("RegisterWebSocketService", () => {
	let service: RegisterWebSocketService;
	let mockInMemorySocket: InMemorySocket;
	let mockCloseHandler: ClosedWebSocketHandlerService;
	let mockWs: WebSocket;
	let mockOldWs: WebSocket;

	beforeEach(() => {
		mockInMemorySocket = {
			getSocket: vi.fn(),
			addSocket: vi.fn(),
			removeSocket: vi.fn(),
			getSockets: vi.fn().mockReturnValue(new Map()),
		} as unknown as InMemorySocket;

		mockCloseHandler = {
			execute: vi.fn(),
		} as unknown as ClosedWebSocketHandlerService;

		mockWs = {
			close: vi.fn(),
		} as unknown as WebSocket;

		mockOldWs = {
			close: vi.fn(),
		} as unknown as WebSocket;

		service = new RegisterWebSocketService(
			mockInMemorySocket,
			mockCloseHandler,
		);
	});

	it("adds new socket and registers close handler", () => {
		vi.mocked(mockInMemorySocket.getSocket).mockReturnValue(undefined);
		service.execute("user1", mockWs);

		expect(mockInMemorySocket.addSocket).toHaveBeenCalledWith("user1", mockWs);
		expect(mockCloseHandler.execute).toHaveBeenCalledWith("user1", mockWs);
	});

	it("closes existing socket when replacing with a new one", () => {
		vi.mocked(mockInMemorySocket.getSocket).mockReturnValue(mockOldWs);
		service.execute("user1", mockWs);

		expect(mockOldWs.close).toHaveBeenCalled();
		expect(mockInMemorySocket.removeSocket).toHaveBeenCalledWith("user1");
		expect(mockInMemorySocket.addSocket).toHaveBeenCalledWith("user1", mockWs);
	});

	it("does not close existing socket if same reference", () => {
		vi.mocked(mockInMemorySocket.getSocket).mockReturnValue(mockWs);
		service.execute("user1", mockWs);

		expect(mockWs.close).not.toHaveBeenCalled();
		expect(mockInMemorySocket.removeSocket).not.toHaveBeenCalled();
	});

	it("handles error when closing existing socket", () => {
		vi.mocked(mockInMemorySocket.getSocket).mockReturnValue(mockOldWs);
		vi.mocked(mockOldWs.close).mockImplementation(() => {
			throw new Error("Socket already closed");
		});

		expect(() => service.execute("user1", mockWs)).not.toThrow();

		expect(mockInMemorySocket.removeSocket).toHaveBeenCalledWith("user1");
		expect(mockInMemorySocket.addSocket).toHaveBeenCalledWith("user1", mockWs);
	});
});
