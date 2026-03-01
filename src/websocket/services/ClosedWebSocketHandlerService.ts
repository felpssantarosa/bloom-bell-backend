import type WebsocketConnection from "ws";
import { Logger } from "../../services/Logger.js";
import type { InMemorySocket } from "../infra/InMemorySocketConnections.js";

export class ClosedWebSocketHandlerService {
	private readonly logger = new Logger("ClosedWebSocketHandlerService");

	constructor(private readonly inMemorySocket: InMemorySocket) {}

	public execute(userId: string, websocketConnection: WebsocketConnection) {
		websocketConnection.on("close", () => {
			this.inMemorySocket.removeSocket(userId);
			this.logger.info("WebSocket connection closed, socket removed");
			this.logger.debug("Removed socket for user ID", userId);
			this.logger.debug("Active sockets after close", [
				...this.inMemorySocket.getSockets().keys(),
			]);
		});
	}
}
