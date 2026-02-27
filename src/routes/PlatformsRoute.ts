import type { Request, Response } from "express";
import type { SQLiteRepository } from "../infra/SQLiteRepository.js";

export class PlatformsController {
	constructor(private readonly sqliteRepository: SQLiteRepository) {}

	public async execute(req: Request, res: Response) {
		const userId = req.query.userId;

		if (typeof userId !== "string") {
			console.warn("Invalid userId in request query: ", userId);

			return res.status(400).json({ error: "Missing or invalid userId" });
		}

		try {
			const platforms =
				this.sqliteRepository.getPlatformsStatusByUserId(userId);

			console.info(`Platforms status for user ${userId}:`, platforms);

			return res.json({ platforms });
		} catch (err) {
			console.error("Error getting platforms status:", err);

			return res.status(500).json({ error: "Internal server error" });
		}
	}
}
