import type { Response } from "express";
import type { SQLiteRepository } from "../../infra/SQLiteRepository.js";
import { Logger } from "../../services/Logger.js";

export class PlatformsService {
	private readonly logger = new Logger("PlatformsService");

	constructor(private readonly sqliteRepository: SQLiteRepository) {}

	public execute(userId: string, res: Response) {
		try {
			const platforms =
				this.sqliteRepository.getPlatformsStatusByUserId(userId);

			return res.json({ platforms });
		} catch (err) {
			this.logger.error("Error getting platforms status", err);
			return res.status(500).json({ error: "Internal server error" });
		}
	}
}
