import type { Request, Response } from "express";
import { z } from "zod";
import { pluginUserIdSchema } from "../../validation/schemas.js";
import type { DisconnectService } from "../services/DisconnectService.js";

const platformSchema = z
	.string()
	.min(1)
	.max(32)
	.regex(
		/^[a-zA-Z0-9_-]+$/,
		"platform must be a short alphanumeric identifier",
	);

const bodySchema = z.object({
	pluginUserId: pluginUserIdSchema,
	platform: platformSchema.optional(),
});

export class DisconnectController {
	constructor(private readonly disconnectService: DisconnectService) {}

	public execute(req: Request, res: Response) {
		const parsed = bodySchema.safeParse(req.body);

		if (!parsed.success) {
			return res.status(400).json({
				error: "Invalid request body",
				details: parsed.error.issues.map((i) => i.message),
			});
		}

		return this.disconnectService.execute(parsed.data, res);
	}
}
