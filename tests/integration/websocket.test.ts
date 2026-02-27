import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket, { type WebSocketServer } from "ws";
import { SQLiteRepository } from "../../src/infra/SQLiteRepository.js";
import { RegisterUserController } from "../../src/websocket/controllers/RegisterUserController.js";
import { WebsocketManager } from "../../src/websocket/index.js";
import { InMemorySocket } from "../../src/websocket/infra/InMemorySocketConnections.js";
import { ClosedWebSocketHandlerService } from "../../src/websocket/services/ClosedWebSocketHandlerService.js";
import { RegisterUserService } from "../../src/websocket/services/RegisterUserService.js";
import { RegisterWebSocketService } from "../../src/websocket/services/RegisterWebSocketConnection.js";

describe("WebSocket Integration Tests", () => {
	let manager: WebsocketManager;
	let inMemorySocket: InMemorySocket;
	let repo: SQLiteRepository;
	const TEST_PORT = 9878;
	const dbPath = path.resolve("data/test-ws-integration.sqlite");

	beforeEach(() => {
		const dataDir = path.resolve("data");
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}
		if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

		inMemorySocket = new InMemorySocket();
		const closeHandler = new ClosedWebSocketHandlerService(inMemorySocket);
		const registerWsService = new RegisterWebSocketService(
			inMemorySocket,
			closeHandler,
		);
		repo = new SQLiteRepository(dbPath);
		const registerUserService = new RegisterUserService(
			registerWsService,
			repo,
		);
		const controller = new RegisterUserController(registerUserService);

		manager = new WebsocketManager(controller, TEST_PORT);
		manager.start();
	});

	afterEach(async () => {
		const wss = (manager as unknown as { webSocketServer: WebSocketServer })
			.webSocketServer;
		for (const client of wss.clients) {
			client.terminate();
		}
		await new Promise<void>((resolve) => wss.close(() => resolve()));
		if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
	});

	function connectClient(): Promise<WebSocket> {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
			ws.on("open", () => resolve(ws));
			ws.on("error", reject);
		});
	}

	function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
		return new Promise((resolve) => {
			ws.on("message", (data) => {
				resolve(JSON.parse(data.toString()));
			});
		});
	}

	it("registers a user via WebSocket and tracks the connection", async () => {
		const ws = await connectClient();

		ws.send(JSON.stringify({ type: "register", userId: "integration-user1" }));

		await new Promise((r) => setTimeout(r, 100));

		const storedSocket = inMemorySocket.getSocket("integration-user1");
		expect(storedSocket).toBeDefined();

		ws.close();
	});

	it("removes user socket on disconnect", async () => {
		const ws = await connectClient();

		ws.send(JSON.stringify({ type: "register", userId: "integration-user2" }));

		await new Promise((r) => setTimeout(r, 100));
		expect(inMemorySocket.getSocket("integration-user2")).toBeDefined();

		ws.close();
		await new Promise((r) => setTimeout(r, 200));

		expect(inMemorySocket.getSocket("integration-user2")).toBeUndefined();
	});

	it("sends authAlreadyLinked when user is already linked to Discord", async () => {
		repo.linkUser("linked-user", "discord999");

		const ws = await connectClient();
		const messagePromise = waitForMessage(ws);

		ws.send(JSON.stringify({ type: "register", userId: "linked-user" }));

		const message = await messagePromise;
		expect(message).toEqual({
			type: "authAlreadyLinked",
			provider: "discord",
			userId: "linked-user",
		});

		ws.close();
	});

	it("does NOT send authAlreadyLinked when user is not linked", async () => {
		const ws = await connectClient();

		let received = false;
		ws.on("message", () => {
			received = true;
		});

		ws.send(JSON.stringify({ type: "register", userId: "unlinked-user" }));

		await new Promise((r) => setTimeout(r, 200));
		expect(received).toBe(false);

		ws.close();
	});

	it("replaces socket when same user reconnects", async () => {
		const ws1 = await connectClient();
		ws1.send(JSON.stringify({ type: "register", userId: "reconnect-user" }));
		await new Promise((r) => setTimeout(r, 100));

		let ws1Closed = false;
		ws1.on("close", () => {
			ws1Closed = true;
		});

		const ws2 = await connectClient();
		ws2.send(JSON.stringify({ type: "register", userId: "reconnect-user" }));
		await new Promise((r) => setTimeout(r, 200));

		expect(ws1Closed).toBe(true);
		expect(ws2.readyState).toBe(WebSocket.OPEN);

		ws2.close();
	});

	it("ignores invalid messages without crashing", async () => {
		const ws = await connectClient();

		ws.send("definitely not json");
		ws.send(JSON.stringify({ noType: true }));
		ws.send(JSON.stringify({ type: 123 }));
		ws.send(JSON.stringify({ type: "register" }));

		await new Promise((r) => setTimeout(r, 200));

		const ws2 = await connectClient();
		expect(ws2.readyState).toBe(WebSocket.OPEN);

		ws.close();
		ws2.close();
	});
});
