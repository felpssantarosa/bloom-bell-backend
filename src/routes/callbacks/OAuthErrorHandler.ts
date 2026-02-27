import type { Response } from "express";
import type { InMemorySocket } from "../../websocket/infra/InMemorySocketConnections.js";

type OAuthErrorParams = {
	error: string;
	errorDescription?: string | undefined;
	pluginUserId: string;
};

export class OAuthErrorHandler {
	constructor(private readonly inMemorySocket: InMemorySocket) {}

	public execute(
		{ error, errorDescription, pluginUserId }: OAuthErrorParams,
		res: Response,
	) {
		console.error(
			`OAuth error for user ${pluginUserId}: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`,
		);

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

			console.log(`Sent authError WS event to ${pluginUserId}`);
		}

		return res.status(400).json({
			error: "OAuth authorization failed",
			details: errorDescription ?? error,
		});
	}
}
