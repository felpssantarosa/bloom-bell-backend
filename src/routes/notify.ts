import type { Request, Response } from "express";
import type { SQLiteRepository } from "../infra/SQLiteRepository.js";
import type { DiscordIntegration } from "../services/DiscordIntegration.js";

export class NotifyController {
	constructor(
		private readonly sqliteRepository: SQLiteRepository,
		private readonly discordIntegration: DiscordIntegration,
	) {}

	public async execute(req: Request, res: Response) {
		const { pluginUserId, partySize, maxSize } = req.body as {
			pluginUserId?: string;
			partySize?: number;
			maxSize?: number;
		};

		if (!pluginUserId) {
			return res.status(400).json({ error: "Missing pluginUserId" });
		}

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

			console.log(`Sent party full DM to ${discordIdFound}`);

			return res.json({ status: "Notification sent" });
		} catch (err) {
			console.error("Notify error:", err);
			return res.status(500).json({ error: "Internal server error" });
		}
	}
}
