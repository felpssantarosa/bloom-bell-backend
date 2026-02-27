import type { Request, Response } from "express";
import type { SQLiteRepository } from "../infra/SQLiteRepository.js";
import { platformsQuerySchema } from "../validation/schemas.js";

export class PlatformsController {
	constructor(private readonly sqliteRepository: SQLiteRepository) {}

	public async execute(req: Request, res: Response) {
		const parsed = platformsQuerySchema.safeParse(req.query);

		if (!parsed.success) {
			return res.status(400).json({
				error: "Invalid request parameters",
				details: parsed.error.issues.map((i) => i.message),
			});
		}

		const { userId } = parsed.data;

		try {
			const platforms =
				this.sqliteRepository.getPlatformsStatusByUserId(userId);

			return res.json({ platforms });
		} catch (err) {
			console.error("Error getting platforms status: ", err);

			return res.status(500).json({ error: "Internal server error" });
		}
	}
}
