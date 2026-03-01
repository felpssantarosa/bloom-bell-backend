import type { Response } from "express";
import type { SQLiteRepository } from "../../infra/SQLiteRepository.js";
import type { DiscordIntegration } from "../../services/DiscordIntegration.js";
import { Logger } from "../../services/Logger.js";
import type { InMemorySocket } from "../../websocket/infra/InMemorySocketConnections.js";

type OAuthSuccessParams = {
	code: string;
	pluginUserId: string;
};

export class OAuthSuccessHandler {
	private readonly logger = new Logger("OAuthSuccessHandler");

	constructor(
		private readonly inMemorySocket: InMemorySocket,
		private readonly sqliteRepository: SQLiteRepository,
		private readonly discordIntegration: DiscordIntegration,
	) {}

	public async execute(
		{ code, pluginUserId }: OAuthSuccessParams,
		res: Response,
	) {
		try {
			const { discordId } =
				await this.discordIntegration.exchangeOAuthCode(code);

			this.sqliteRepository.linkUser(pluginUserId, discordId);

			this.logger.info("OAuth flow completed, account linked");
			this.logger.debug("Linked plugin user to Discord", {
				pluginUserId,
				discordId,
			});

			await this.discordIntegration.sendDirectMessage({
				userId: discordId,
				message: "✅ Your FFXIV plugin has been successfully linked!",
			});

			const socket = this.inMemorySocket.getSocket(pluginUserId);

			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(
					JSON.stringify({
						type: "authComplete",
						provider: "discord",
						pluginUserId,
					}),
				);

				this.logger.info("Sent authComplete WS event to plugin user");
				this.logger.debug("Plugin user ID", pluginUserId);
			} else {
				this.logger.info(
					"WS not active for plugin user; auth state will sync on next register",
				);
				this.logger.debug("Plugin user ID", pluginUserId);
			}

			return res.json({
				message: "Account linked! You can close this window.",
			});
		} catch (err) {
			this.logger.error("OAuth callback error occurred", err);
			return res.status(500).json({ error: "OAuth failed" });
		}
	}
}
