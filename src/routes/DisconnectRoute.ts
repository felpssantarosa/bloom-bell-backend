import type { Request, Response } from "express";
import { z } from "zod";
import type { SQLiteRepository } from "../infra/SQLiteRepository.js";
import { pluginUserIdSchema } from "../validation/schemas.js";

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
	constructor(private readonly sqliteRepository: SQLiteRepository) {}

	public execute(req: Request, res: Response) {
		const parsed = bodySchema.safeParse(req.body);

		if (!parsed.success) {
			return res.status(400).json({
				error: "Invalid request body",
				details: parsed.error.issues.map((i) => i.message),
			});
		}

		const { pluginUserId, platform } = parsed.data;
		const targetPlatform = platform ?? "discord";

		try {
			const removed = this.sqliteRepository.unlinkPlatform(
				pluginUserId,
				targetPlatform,
			);

			if (!removed) {
				return res
					.status(404)
					.json({ error: "No linked record found for given platform" });
			}

			console.log(
				`Unlinked plugin user ${pluginUserId} from ${targetPlatform}`,
			);
			return res.json({ status: "Disconnected", platform: targetPlatform });
		} catch (err) {
			console.error("Disconnect error occurred:", err);
			return res.status(500).json({ error: "Internal server error" });
		}
	}
}
