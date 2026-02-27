import { describe, expect, it } from "vitest";
import { websocketMessageParser } from "../../src/websocket/MessageParser.js";

describe("websocketMessageParser", () => {
	it("parses a valid JSON buffer with type field", () => {
		const data = Buffer.from(
			JSON.stringify({ type: "register", userId: "user1" }),
		);
		const result = websocketMessageParser(data);
		expect(result).toEqual({ type: "register", userId: "user1" });
	});

	it("parses a valid JSON string with type field", () => {
		const data = JSON.stringify({ type: "register", userId: "user1" });
		const result = websocketMessageParser(data as unknown as Buffer);
		expect(result).toEqual({ type: "register", userId: "user1" });
	});

	it("returns null for invalid JSON", () => {
		const data = Buffer.from("not json at all");
		expect(websocketMessageParser(data)).toBeNull();
	});

	it("returns null for empty string", () => {
		const data = Buffer.from("");
		expect(websocketMessageParser(data)).toBeNull();
	});

	it("returns null for JSON array", () => {
		const data = Buffer.from(JSON.stringify([1, 2, 3]));
		expect(websocketMessageParser(data)).toBeNull();
	});

	it("returns null for JSON null", () => {
		const data = Buffer.from("null");
		expect(websocketMessageParser(data)).toBeNull();
	});

	it("returns null for JSON primitive", () => {
		const data = Buffer.from('"hello"');
		expect(websocketMessageParser(data)).toBeNull();
	});

	it("returns null if type field is missing", () => {
		const data = Buffer.from(JSON.stringify({ userId: "user1" }));
		expect(websocketMessageParser(data)).toBeNull();
	});

	it("returns null if type field is not a string", () => {
		const data = Buffer.from(JSON.stringify({ type: 123, userId: "user1" }));
		expect(websocketMessageParser(data)).toBeNull();
	});

	it("handles Buffer array data", () => {
		const part1 = Buffer.from('{"type":');
		const part2 = Buffer.from('"register","userId":"u1"}');
		const data = [part1, part2] as unknown as Buffer;
		const result = websocketMessageParser(data);
		expect(result).toEqual({ type: "register", userId: "u1" });
	});
});
