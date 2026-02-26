import type { Request, Response } from "express";
import type { SQLiteRepository } from "../infra/SQLiteRepository.js";
import type { DiscordIntegration } from "../services/DiscordIntegration.js";
import type { InMemorySocket } from "../websocket/infra/InMemorySocketConnections.js";

export class CallbackController {
	constructor(
		private readonly inMemorySocket: InMemorySocket,
		private readonly sqliteRepository: SQLiteRepository,
		private readonly discordIntegration: DiscordIntegration,
	) {}

	public async execute(req: Request, res: Response) {
		const code = req.query.code;
		const pluginUserId = req.query.state;

		if (typeof code !== "string" || typeof pluginUserId !== "string") {
			return res.status(400).send("Missing code or state");
		}

		try {
			const { discordId } =
				await this.discordIntegration.exchangeOAuthCode(code);

			this.sqliteRepository.linkUser(pluginUserId, discordId);

			console.log(
				`✅ Linked plugin user with ID ${pluginUserId} to the Discord user with ID ${discordId}`,
			);

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

				console.log(`📡 Sent authComplete WS event to ${pluginUserId}`);
			} else {
				console.log(
					`ℹ️ WS not active for ${pluginUserId}. Plugin will receive auth state on next register.`,
				);
			}

			return res.json({
				message: "Account linked! You can close this window.",
			});
		} catch (err) {
			console.error("OAuth error:", err);
			return res.status(500).send("OAuth failed");
		}
	}
}
