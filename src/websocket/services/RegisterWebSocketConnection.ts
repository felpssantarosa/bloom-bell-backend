import type WebsocketConnection from "ws";
import { Logger } from "../../services/Logger.js";
import type { InMemorySocket } from "../infra/InMemorySocketConnections.js";
import type { ClosedWebSocketHandlerService } from "./ClosedWebSocketHandlerService.js";

export class RegisterWebSocketService {
	private readonly logger = new Logger("RegisterWebSocketService");

	constructor(
		private readonly inMemorySocket: InMemorySocket,
		private readonly closedWebSocketHandlerService: ClosedWebSocketHandlerService,
	) {}

	public execute(userId: string, websocketConnection: WebsocketConnection) {
		const existingSocket = this.inMemorySocket.getSocket(userId);

		if (existingSocket && existingSocket !== websocketConnection) {
			this.logger.warn("Replacing existing socket for user");
			this.logger.debug("Replacing existing socket for user ID", userId);
			try {
				existingSocket.close();
			} catch (error) {
				this.logger.error("Failed to close existing socket for user", error);
				this.logger.debug("Failed socket user ID", userId);
			}

			this.inMemorySocket.removeSocket(userId);
		}

		this.inMemorySocket.addSocket(userId, websocketConnection);

		this.logger.info("WebSocket registered for user");
		this.logger.debug("Registered WS for user ID", userId);
		this.logger.debug("Active sockets", [
			...this.inMemorySocket.getSockets().keys(),
		]);

		this.logger.debug(
			"Registering close connection handler for user ID",
			userId,
		);
		this.closedWebSocketHandlerService.execute(userId, websocketConnection);
	}
}
