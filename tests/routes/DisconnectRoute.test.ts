import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQLiteRepository } from "../../src/infra/SQLiteRepository.js";
import { DisconnectController } from "../../src/routes/controllers/DisconnectController.js";
import { DisconnectService } from "../../src/routes/services/DisconnectService.js";

describe("DisconnectController + DisconnectService", () => {
	let controller: DisconnectController;
	let mockSqliteRepository: SQLiteRepository;
	let req: Partial<Request>;
	let res: Partial<Response>;

	beforeEach(() => {
		mockSqliteRepository = {
			unlinkPlatform: vi.fn(),
		} as unknown as SQLiteRepository;

		res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};

		controller = new DisconnectController(
			new DisconnectService(mockSqliteRepository),
		);
	});

	it("returns 400 when body is empty", () => {
		req = { body: {} };
		controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when pluginUserId has invalid characters", () => {
		req = { body: { pluginUserId: "user<script>" } };
		controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when platform has invalid characters", () => {
		req = { body: { pluginUserId: "user1", platform: "bad platform!" } };
		controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when platform is not supported", () => {
		req = { body: { pluginUserId: "user1", platform: "telegram" } };
		controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 404 when platform link is not found", () => {
		req = { body: { pluginUserId: "user1" } };
		vi.mocked(mockSqliteRepository.unlinkPlatform).mockReturnValue("not_found");
		controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({
			error: "No linked record found for given platform",
		});
	});

	it("returns 400 when repository reports unsupported platform", () => {
		req = { body: { pluginUserId: "user1" } };
		vi.mocked(mockSqliteRepository.unlinkPlatform).mockReturnValue(
			"unsupported_platform",
		);
		controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: 'Platform "discord" is not supported',
		});
	});

	it("returns success and defaults platform to discord", () => {
		req = { body: { pluginUserId: "user1" } };
		vi.mocked(mockSqliteRepository.unlinkPlatform).mockReturnValue("unlinked");
		controller.execute(req as Request, res as Response);
		expect(mockSqliteRepository.unlinkPlatform).toHaveBeenCalledWith(
			"user1",
			"discord",
		);
		expect(res.json).toHaveBeenCalledWith({
			status: "Disconnected",
			platform: "discord",
		});
	});

	it("uses the specified platform instead of the default", () => {
		req = { body: { pluginUserId: "user1", platform: "discord" } };
		vi.mocked(mockSqliteRepository.unlinkPlatform).mockReturnValue("unlinked");
		controller.execute(req as Request, res as Response);
		expect(mockSqliteRepository.unlinkPlatform).toHaveBeenCalledWith(
			"user1",
			"discord",
		);
		expect(res.json).toHaveBeenCalledWith({
			status: "Disconnected",
			platform: "discord",
		});
	});

	it("returns 500 when repository throws", () => {
		req = { body: { pluginUserId: "user1" } };
		vi.mocked(mockSqliteRepository.unlinkPlatform).mockImplementation(() => {
			throw new Error("DB error");
		});
		controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
	});
});
