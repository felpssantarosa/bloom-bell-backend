import type { Request, Response } from "express";
import { platformsQuerySchema } from "../../validation/schemas.js";
import type { PlatformsService } from "../services/PlatformsService.js";

export class PlatformsController {
	constructor(private readonly platformsService: PlatformsService) {}

	public async execute(req: Request, res: Response) {
		const parsed = platformsQuerySchema.safeParse(req.query);

		if (!parsed.success) {
			return res.status(400).json({
				error: "Invalid request parameters",
				details: parsed.error.issues.map((i) => i.message),
			});
		}

		return this.platformsService.execute(parsed.data.userId, res);
	}
}
