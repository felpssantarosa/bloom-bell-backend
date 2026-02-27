import { beforeEach, describe, expect, it, vi } from "vitest";
import type WebSocket from "ws";
import { InMemorySocket } from "../../src/websocket/infra/InMemorySocketConnections.js";

describe("InMemorySocket", () => {
	let store: InMemorySocket;
	let mockSocket1: WebSocket;
	let mockSocket2: WebSocket;

	beforeEach(() => {
		store = new InMemorySocket();
		mockSocket1 = { close: vi.fn() } as unknown as WebSocket;
		mockSocket2 = { close: vi.fn() } as unknown as WebSocket;
	});

	it("adds and retrieves a socket", () => {
		store.addSocket("user1", mockSocket1);
		expect(store.getSocket("user1")).toBe(mockSocket1);
	});

	it("returns undefined for unknown user", () => {
		expect(store.getSocket("nonexistent")).toBeUndefined();
	});

	it("removes a socket", () => {
		store.addSocket("user1", mockSocket1);
		store.removeSocket("user1");
		expect(store.getSocket("user1")).toBeUndefined();
	});

	it("overwrites socket for same user", () => {
		store.addSocket("user1", mockSocket1);
		store.addSocket("user1", mockSocket2);
		expect(store.getSocket("user1")).toBe(mockSocket2);
	});

	it("returns all sockets", () => {
		store.addSocket("user1", mockSocket1);
		store.addSocket("user2", mockSocket2);
		const all = store.getSockets();
		expect(all.size).toBe(2);
		expect(all.get("user1")).toBe(mockSocket1);
		expect(all.get("user2")).toBe(mockSocket2);
	});

	it("handles removing non-existent socket gracefully", () => {
		expect(() => store.removeSocket("nonexistent")).not.toThrow();
	});
});
