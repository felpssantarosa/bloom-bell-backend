import { beforeEach, describe, expect, it, vi } from "vitest";
import type WebSocket from "ws";
import { RegisterUserController } from "../../src/websocket/controllers/RegisterUserController.js";
import type { RegisterUserService } from "../../src/websocket/services/RegisterUserService.js";

describe("RegisterUserController", () => {
	let controller: RegisterUserController;
	let mockService: RegisterUserService;
	let mockWs: WebSocket;

	beforeEach(() => {
		mockService = {
			execute: vi.fn(),
		} as unknown as RegisterUserService;

		mockWs = {} as WebSocket;
		controller = new RegisterUserController(mockService);
	});

	it("calls service with valid register message", () => {
		controller.execute({ type: "register", userId: "user1" }, mockWs);
		expect(mockService.execute).toHaveBeenCalledWith("user1", mockWs);
	});

	it("does not call service when type is wrong", () => {
		controller.execute({ type: "invalid", userId: "user1" }, mockWs);
		expect(mockService.execute).not.toHaveBeenCalled();
	});

	it("does not call service when userId is missing", () => {
		controller.execute({ type: "register" }, mockWs);
		expect(mockService.execute).not.toHaveBeenCalled();
	});

	it("does not call service when userId is empty", () => {
		controller.execute({ type: "register", userId: "" }, mockWs);
		expect(mockService.execute).not.toHaveBeenCalled();
	});

	it("does not call service when message is null", () => {
		controller.execute(null, mockWs);
		expect(mockService.execute).not.toHaveBeenCalled();
	});

	it("does not call service when userId is a number", () => {
		controller.execute({ type: "register", userId: 123 }, mockWs);
		expect(mockService.execute).not.toHaveBeenCalled();
	});
});
