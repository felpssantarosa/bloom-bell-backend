import type { Request, Response } from "express";
import type { SQLiteRepository } from "../infra/SQLiteRepository.js";
import type { DiscordIntegration } from "../services/DiscordIntegration.js";
import { notifyBodySchema } from "../validation/schemas.js";

export class NotifyController {
	constructor(
		private readonly sqliteRepository: SQLiteRepository,
		private readonly discordIntegration: DiscordIntegration,
	) {}

	public async execute(req: Request, res: Response) {
		const parsed = notifyBodySchema.safeParse(req.body);

		if (!parsed.success) {
			return res.status(400).json({
				error: "Invalid request body",
				details: parsed.error.issues.map((i) => i.message),
			});
		}

		const { pluginUserId, partySize, maxSize } = parsed.data;

		try {
			const discordIdFound =
				this.sqliteRepository.getDiscordIdByPluginUserId(pluginUserId);

			if (!discordIdFound) {
				return res.status(404).json({ error: "User not linked to Discord" });
			}

			if (
				partySize !== undefined &&
				maxSize !== undefined &&
				partySize < maxSize
			) {
				return res.json({ status: "Party not full yet" });
			}

			await this.discordIntegration.sendDirectMessage({
				userId: discordIdFound,
				message: "🎉 Your party is full! Time to queue!",
			});

			console.log(`Sent party notification for user ${pluginUserId}`);

			return res.json({ status: "Notification sent" });
		} catch (err) {
			console.error("Notify error occurred: ", err);
			return res.status(500).json({ error: "Internal server error" });
		}
	}
}
