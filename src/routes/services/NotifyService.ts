import type { Response } from "express";
import type { SQLiteRepository } from "../../infra/SQLiteRepository.js";
import type { DiscordIntegration } from "../../services/DiscordIntegration.js";
import { Logger } from "../../services/Logger.js";

type NotifyParams = {
	pluginUserId: string;
	partySize?: number | undefined;
	maxSize?: number | undefined;
};

export class NotifyService {
	private readonly logger = new Logger("NotifyService");

	constructor(
		private readonly sqliteRepository: SQLiteRepository,
		private readonly discordIntegration: DiscordIntegration,
	) {}

	public async execute(
		{ pluginUserId, partySize, maxSize }: NotifyParams,
		res: Response,
	) {
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

			this.logger.info("Party notification sent");
			this.logger.debug("Sent party notification for user", pluginUserId);

			return res.json({ status: "Notification sent" });
		} catch (err) {
			this.logger.error("Notify error occurred", err);
			return res.status(500).json({ error: "Internal server error" });
		}
	}
}
