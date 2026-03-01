import type { Request, Response } from "express";
import { notifyBodySchema } from "../../validation/schemas.js";
import type { NotifyService } from "../services/NotifyService.js";

export class NotifyController {
	constructor(private readonly notifyService: NotifyService) {}

	public async execute(req: Request, res: Response) {
		const parsed = notifyBodySchema.safeParse(req.body);

		if (!parsed.success) {
			return res.status(400).json({
				error: "Invalid request body",
				details: parsed.error.issues.map((i) => i.message),
			});
		}

		return this.notifyService.execute(parsed.data, res);
	}
}
