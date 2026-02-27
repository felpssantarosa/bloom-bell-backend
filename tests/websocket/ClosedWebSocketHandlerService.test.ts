import { beforeEach, describe, expect, it, vi } from "vitest";
import type WebSocket from "ws";
import type { InMemorySocket } from "../../src/websocket/infra/InMemorySocketConnections.js";
import { ClosedWebSocketHandlerService } from "../../src/websocket/services/ClosedWebSocketHandlerService.js";

describe("ClosedWebSocketHandlerService", () => {
	let service: ClosedWebSocketHandlerService;
	let mockInMemorySocket: InMemorySocket;

	beforeEach(() => {
		mockInMemorySocket = {
			removeSocket: vi.fn(),
			getSockets: vi.fn().mockReturnValue(new Map()),
		} as unknown as InMemorySocket;

		service = new ClosedWebSocketHandlerService(mockInMemorySocket);
	});

	it("registers a close handler that removes the socket", () => {
		const handlers: Record<string, () => void> = {};
		const mockWs = {
			on: vi.fn((event: string, handler: () => void) => {
				handlers[event] = handler;
			}),
		} as unknown as WebSocket;

		service.execute("user1", mockWs);

		expect(mockWs.on).toHaveBeenCalledWith("close", expect.any(Function));

		handlers.close?.();

		expect(mockInMemorySocket.removeSocket).toHaveBeenCalledWith("user1");
	});
});
