import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQLiteRepository } from "../../src/infra/SQLiteRepository.js";
import { PlatformsController } from "../../src/routes/PlatformsRoute.js";

describe("PlatformsController", () => {
	let controller: PlatformsController;
	let mockSqliteRepository: SQLiteRepository;
	let req: Partial<Request>;
	let res: Partial<Response>;

	beforeEach(() => {
		mockSqliteRepository = {
			getPlatformsStatusByUserId: vi.fn(),
		} as unknown as SQLiteRepository;

		res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};

		controller = new PlatformsController(mockSqliteRepository);
	});

	it("returns 400 when userId is missing", async () => {
		req = { query: {} };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when userId has special characters", async () => {
		req = { query: { userId: "../etc/passwd" } };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when userId has SQL injection attempt", async () => {
		req = { query: { userId: "'; DROP TABLE linked_users; --" } };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns platforms for valid userId", async () => {
		req = { query: { userId: "user42" } };
		vi.mocked(mockSqliteRepository.getPlatformsStatusByUserId).mockReturnValue({
			discord: true,
			telegram: false,
		});

		await controller.execute(req as Request, res as Response);

		expect(res.json).toHaveBeenCalledWith({
			platforms: { discord: true, telegram: false },
		});
	});

	it("returns platforms with discord=false for unlinked user", async () => {
		req = { query: { userId: "newuser" } };
		vi.mocked(mockSqliteRepository.getPlatformsStatusByUserId).mockReturnValue({
			discord: false,
			telegram: false,
		});

		await controller.execute(req as Request, res as Response);

		expect(res.json).toHaveBeenCalledWith({
			platforms: { discord: false, telegram: false },
		});
	});

	it("returns 500 when repository throws", async () => {
		req = { query: { userId: "user42" } };
		vi.mocked(
			mockSqliteRepository.getPlatformsStatusByUserId,
		).mockImplementation(() => {
			throw new Error("DB error");
		});

		await controller.execute(req as Request, res as Response);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
	});
});
