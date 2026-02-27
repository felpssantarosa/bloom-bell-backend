import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQLiteRepository } from "../../src/infra/SQLiteRepository.js";
import { NotifyController } from "../../src/routes/NotifyRoute.js";
import type { DiscordIntegration } from "../../src/services/DiscordIntegration.js";

describe("NotifyController", () => {
	let controller: NotifyController;
	let mockSqliteRepository: SQLiteRepository;
	let mockDiscordIntegration: DiscordIntegration;
	let req: Partial<Request>;
	let res: Partial<Response>;

	beforeEach(() => {
		mockSqliteRepository = {
			getDiscordIdByPluginUserId: vi.fn(),
		} as unknown as SQLiteRepository;

		mockDiscordIntegration = {
			sendDirectMessage: vi.fn(),
		} as unknown as DiscordIntegration;

		res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};

		controller = new NotifyController(
			mockSqliteRepository,
			mockDiscordIntegration,
		);
	});

	it("returns 400 when body is empty", async () => {
		req = { body: {} };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when pluginUserId is missing", async () => {
		req = { body: { partySize: 4, maxSize: 8 } };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when pluginUserId has invalid characters", async () => {
		req = { body: { pluginUserId: "user<script>" } };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when partySize is not an integer", async () => {
		req = { body: { pluginUserId: "user1", partySize: 4.5, maxSize: 8 } };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 when partySize is out of range", async () => {
		req = { body: { pluginUserId: "user1", partySize: 100, maxSize: 8 } };
		await controller.execute(req as Request, res as Response);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 404 when user is not linked", async () => {
		req = { body: { pluginUserId: "user1" } };
		vi.mocked(mockSqliteRepository.getDiscordIdByPluginUserId).mockReturnValue(
			null,
		);

		await controller.execute(req as Request, res as Response);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({
			error: "User not linked to Discord",
		});
	});

	it("returns 'Party not full yet' when partySize < maxSize", async () => {
		req = { body: { pluginUserId: "user1", partySize: 3, maxSize: 8 } };
		vi.mocked(mockSqliteRepository.getDiscordIdByPluginUserId).mockReturnValue(
			"discord123",
		);

		await controller.execute(req as Request, res as Response);

		expect(res.json).toHaveBeenCalledWith({ status: "Party not full yet" });
		expect(mockDiscordIntegration.sendDirectMessage).not.toHaveBeenCalled();
	});

	it("sends notification when party is full (partySize >= maxSize)", async () => {
		req = { body: { pluginUserId: "user1", partySize: 8, maxSize: 8 } };
		vi.mocked(mockSqliteRepository.getDiscordIdByPluginUserId).mockReturnValue(
			"discord123",
		);
		vi.mocked(mockDiscordIntegration.sendDirectMessage).mockResolvedValue(
			undefined,
		);

		await controller.execute(req as Request, res as Response);

		expect(mockDiscordIntegration.sendDirectMessage).toHaveBeenCalledWith({
			userId: "discord123",
			message: "🎉 Your party is full! Time to queue!",
		});
		expect(res.json).toHaveBeenCalledWith({ status: "Notification sent" });
	});

	it("sends notification when no party size info provided", async () => {
		req = { body: { pluginUserId: "user1" } };
		vi.mocked(mockSqliteRepository.getDiscordIdByPluginUserId).mockReturnValue(
			"discord123",
		);
		vi.mocked(mockDiscordIntegration.sendDirectMessage).mockResolvedValue(
			undefined,
		);

		await controller.execute(req as Request, res as Response);

		expect(mockDiscordIntegration.sendDirectMessage).toHaveBeenCalled();
		expect(res.json).toHaveBeenCalledWith({ status: "Notification sent" });
	});

	it("returns 500 when Discord DM fails", async () => {
		req = { body: { pluginUserId: "user1" } };
		vi.mocked(mockSqliteRepository.getDiscordIdByPluginUserId).mockReturnValue(
			"discord123",
		);
		vi.mocked(mockDiscordIntegration.sendDirectMessage).mockRejectedValue(
			new Error("Discord error"),
		);

		await controller.execute(req as Request, res as Response);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
	});
});
