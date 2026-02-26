import type WebsocketConnection from "ws";
import type { SQLiteRepository } from "../../infra/SQLiteRepository.js";
import type { RegisterWebSocketService } from "./RegisterWebSocketConnection.js";

export class RegisterUserService {
	constructor(
		private readonly registerWebSocketService: RegisterWebSocketService,
		private readonly sqliteRepository: SQLiteRepository,
	) {}

	public execute(userId: string, websocketConnection: WebsocketConnection) {
		this.registerWebSocketService.execute(userId, websocketConnection);

		const discordIdFound =
			this.sqliteRepository.getDiscordIdByPluginUserId(userId);

		const messageToSend = {
			type: "authAlreadyLinked",
			provider: "discord",
			userId,
		};

		if (discordIdFound) websocketConnection.send(JSON.stringify(messageToSend));
	}
}
