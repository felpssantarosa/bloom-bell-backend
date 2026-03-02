import type { Response } from "express";
import { Logger } from "../../services/Logger.js";
import type { InMemorySocket } from "../../websocket/infra/InMemorySocketConnections.js";

type OAuthErrorParams = {
	error: string;
	errorDescription?: string | undefined;
	pluginUserId: string;
};

export class OAuthErrorHandler {
	private readonly logger = new Logger("OAuthErrorHandler");

	constructor(private readonly inMemorySocket: InMemorySocket) {}

	public execute(
		{ error, errorDescription, pluginUserId }: OAuthErrorParams,
		res: Response,
	) {
		this.logger.warn("OAuth authorization error received");
		this.logger.debug("OAuth error detail", {
			pluginUserId,
			error,
			errorDescription,
		});

		const socket = this.inMemorySocket.getSocket(pluginUserId);

		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(
				JSON.stringify({
					type: "authError",
					provider: "discord",
					pluginUserId,
					error,
				}),
			);

			this.logger.info("Sent authError WS event to plugin user");
			this.logger.debug("Plugin user ID", pluginUserId);
		}

		return res.status(400).json({
			error: "OAuth authorization failed",
			details: errorDescription ?? error,
		});
	}
}
