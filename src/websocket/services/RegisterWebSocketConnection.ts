import type WebsocketConnection from "ws";
import type { InMemorySocket } from "../infra/InMemorySocketConnections.js";
import type { ClosedWebSocketHandlerService } from "./ClosedWebSocketHandlerService.js";

export class RegisterWebSocketService {
	constructor(
		private readonly inMemorySocket: InMemorySocket,
		private readonly closedWebSocketHandlerService: ClosedWebSocketHandlerService,
	) {}

	public execute(userId: string, websocketConnection: WebsocketConnection) {
		const existingSocket = this.inMemorySocket.getSocket(userId);

		if (existingSocket && existingSocket !== websocketConnection) {
			console.warn(`🔁 Replacing existing socket for user ID: ${userId}`);
			try {
				existingSocket.close();
			} catch (error) {
				console.error(
					`Failed to close existing socket for user ID: ${userId}`,
					error,
				);
			}

			this.inMemorySocket.removeSocket(userId);
		}

		this.inMemorySocket.addSocket(userId, websocketConnection);

		console.log(`✅ Registered WS for user ID: ${userId}`);
		console.log("Active sockets:", [
			...this.inMemorySocket.getSockets().keys(),
		]);

		console.info(`Registering close connection handler for user ID: ${userId}`);
		this.closedWebSocketHandlerService.execute(userId, websocketConnection);
	}
}
