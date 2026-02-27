import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket, { WebSocketServer } from "ws";
import type { RegisterUserController } from "../../src/websocket/controllers/RegisterUserController.js";
import { WebsocketManager } from "../../src/websocket/index.js";

describe("WebsocketManager", () => {
	let manager: WebsocketManager;
	let mockController: RegisterUserController;
	const TEST_PORT = 9876;

	beforeEach(() => {
		mockController = {
			execute: vi.fn(),
		} as unknown as RegisterUserController;

		manager = new WebsocketManager(mockController, TEST_PORT);
	});

	afterEach(async () => {
		const wss = (manager as unknown as { webSocketServer: WebSocketServer })
			.webSocketServer;
		for (const client of wss.clients) {
			client.terminate();
		}
		await new Promise<void>((resolve) => wss.close(() => resolve()));
	});

	function connectClient(): Promise<WebSocket> {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
			ws.on("open", () => resolve(ws));
			ws.on("error", reject);
		});
	}

	it("accepts WebSocket connections", async () => {
		manager.start();
		const ws = await connectClient();
		expect(ws.readyState).toBe(WebSocket.OPEN);
		ws.close();
	});

	it("routes valid register messages to the controller", async () => {
		manager.start();
		const ws = await connectClient();

		ws.send(JSON.stringify({ type: "register", userId: "user1" }));

		await new Promise((r) => setTimeout(r, 50));

		expect(mockController.execute).toHaveBeenCalledWith(
			{ type: "register", userId: "user1" },
			expect.anything(),
		);

		ws.close();
	});

	it("ignores messages with unknown controller type", async () => {
		manager.start();
		const ws = await connectClient();

		ws.send(JSON.stringify({ type: "unknownType", data: "test" }));

		await new Promise((r) => setTimeout(r, 50));

		expect(mockController.execute).not.toHaveBeenCalled();

		ws.close();
	});

	it("ignores invalid JSON messages", async () => {
		manager.start();
		const ws = await connectClient();

		ws.send("not json");

		await new Promise((r) => setTimeout(r, 50));

		expect(mockController.execute).not.toHaveBeenCalled();

		ws.close();
	});

	it("tracks active connections and decrements on close", async () => {
		manager.start();
		const accessManager = manager as unknown as { activeConnections: number };

		const ws1 = await connectClient();
		const ws2 = await connectClient();

		await new Promise((r) => setTimeout(r, 50));
		expect(accessManager.activeConnections).toBe(2);

		ws1.close();
		await new Promise((r) => setTimeout(r, 100));
		expect(accessManager.activeConnections).toBe(1);

		ws2.close();
		await new Promise((r) => setTimeout(r, 100));
		expect(accessManager.activeConnections).toBe(0);
	});

	it("responds to pong (heartbeat)", async () => {
		manager.start();
		const ws = await connectClient();

		ws.ping();

		await new Promise((r) => setTimeout(r, 50));

		const wsConnection = (
			manager as unknown as { webSocketServer: WebSocketServer }
		).webSocketServer.clients
			.values()
			.next().value as WebSocket & {
			isAlive?: boolean;
		};
		expect(wsConnection).toBeDefined();

		expect(wsConnection.isAlive).toBe(true);

		ws.close();
	});

	it("rate limits messages and closes connection on excess", async () => {
		manager.start();
		const ws = await connectClient();

		for (let i = 0; i <= 31; i++) {
			ws.send(JSON.stringify({ type: "register", userId: `user${i}` }));
		}

		const closed = await new Promise<number>((resolve) => {
			ws.on("close", (code) => resolve(code));
			setTimeout(() => resolve(-1), 2000);
		});

		expect(closed).toBe(1008);
	});

	it("handles WebSocket errors gracefully", async () => {
		manager.start();
		const ws = await connectClient();

		const wss = (manager as unknown as { webSocketServer: WebSocketServer })
			.webSocketServer;
		const serverSocket = [...wss.clients][0];

		serverSocket.emit("error", new Error("Simulated connection error"));

		await new Promise((r) => setTimeout(r, 50));

		expect(wss.clients.size).toBeGreaterThanOrEqual(1);

		ws.close();
	});

	it("terminates dead clients during heartbeat", async () => {
		const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
		manager.start();

		const heartbeatCallback = setIntervalSpy.mock.calls[0][0] as () => void;

		const ws = await connectClient();
		await new Promise((r) => setTimeout(r, 50));

		const wss = (manager as unknown as { webSocketServer: WebSocketServer })
			.webSocketServer;
		const serverSocket = [...wss.clients][0] as WebSocket & {
			isAlive?: boolean;
		};

		serverSocket.isAlive = false;

		heartbeatCallback();

		await new Promise((r) => setTimeout(r, 200));

		expect(ws.readyState).toBe(WebSocket.CLOSED);

		setIntervalSpy.mockRestore();
	});

	it("pings alive clients during heartbeat and sets isAlive to false", async () => {
		const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
		manager.start();

		const heartbeatCallback = setIntervalSpy.mock.calls[0][0] as () => void;

		const ws = await connectClient();
		await new Promise((r) => setTimeout(r, 50));

		const wss = (manager as unknown as { webSocketServer: WebSocketServer })
			.webSocketServer;
		const serverSocket = [...wss.clients][0] as WebSocket & {
			isAlive?: boolean;
		};

		expect(serverSocket.isAlive).toBe(true);

		heartbeatCallback();

		expect(serverSocket.isAlive).toBe(false);

		await new Promise((r) => setTimeout(r, 200));

		expect(serverSocket.isAlive).toBe(true);

		ws.close();
		setIntervalSpy.mockRestore();
	});

	it("rejects connections when limit is reached", async () => {
		manager.start();

		const accessManager = manager as unknown as {
			activeConnections: number;
		};
		accessManager.activeConnections = 1000;

		const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
		const closed = await new Promise<number>((resolve) => {
			ws.on("close", (code) => resolve(code));
			setTimeout(() => resolve(-1), 3000);
		});

		expect(closed).toBe(1013);
	});

	it("clears heartbeat interval when server closes", async () => {
		const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
		manager.start();

		const wss = (manager as unknown as { webSocketServer: WebSocketServer })
			.webSocketServer;

		await new Promise<void>((resolve) => wss.close(() => resolve()));

		expect(clearIntervalSpy).toHaveBeenCalled();

		clearIntervalSpy.mockRestore();

		const newWss = new WebSocketServer({ port: TEST_PORT });
		(
			manager as unknown as { webSocketServer: WebSocketServer }
		).webSocketServer = newWss;
	});

	it("resets message rate limit counter after window", async () => {
		const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
		manager.start();

		const ws = await connectClient();
		await new Promise((r) => setTimeout(r, 50));

		const rateLimitResetCallback = setIntervalSpy.mock
			.calls[1][0] as () => void;

		for (let i = 0; i < 25; i++) {
			ws.send(JSON.stringify({ type: "register", userId: `user${i}` }));
		}
		await new Promise((r) => setTimeout(r, 100));

		rateLimitResetCallback();

		for (let i = 0; i < 25; i++) {
			ws.send(JSON.stringify({ type: "register", userId: `userAgain${i}` }));
		}
		await new Promise((r) => setTimeout(r, 100));

		expect(ws.readyState).toBe(WebSocket.OPEN);

		ws.close();
		setIntervalSpy.mockRestore();
	});
});
