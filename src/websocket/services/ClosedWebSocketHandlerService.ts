import type WebsocketConnection from "ws";
import type { InMemorySocket } from "../infra/InMemorySocketConnections.js";

export class ClosedWebSocketHandlerService {
	constructor(private readonly inMemorySocket: InMemorySocket) {}

	public execute(userId: string, websocketConnection: WebsocketConnection) {
		websocketConnection.on("close", () => {
			this.inMemorySocket.removeSocket(userId);
			console.log(`❌ Removed socket for user ID: ${userId}`);
			console.log("Active sockets after close:", [
				...this.inMemorySocket.getSockets().keys(),
			]);
		});
	}
}
