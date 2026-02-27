import type { Response } from "express";
import type { SQLiteRepository } from "../../infra/SQLiteRepository.js";
import type { DiscordIntegration } from "../../services/DiscordIntegration.js";
import type { InMemorySocket } from "../../websocket/infra/InMemorySocketConnections.js";

type OAuthSuccessParams = {
	code: string;
	pluginUserId: string;
};

export class OAuthSuccessHandler {
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

			console.log(`Linked plugin user ${pluginUserId} to Discord account`);

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

				console.log(`Sent authComplete WS event to ${pluginUserId}`);
			} else {
				console.log(
					`WS not active for ${pluginUserId}. Plugin will receive auth state on next register.`,
				);
			}

			return res.json({
				message: "Account linked! You can close this window.",
			});
		} catch (err) {
			console.error("OAuth callback error occurred: ", err);
			return res.status(500).json({ error: "OAuth failed" });
		}
	}
}
