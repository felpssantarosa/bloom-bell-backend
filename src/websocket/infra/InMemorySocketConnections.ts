import type WebSocketConnection from "ws";

export class InMemorySocket {
	private socketConnections = new Map<string, WebSocketConnection>();

	public addSocket(userId: string, socket: WebSocketConnection) {
		this.socketConnections.set(userId, socket);
	}

	public removeSocket(userId: string) {
		this.socketConnections.delete(userId);
	}

	public getSocket(userId: string): WebSocketConnection | undefined {
		return this.socketConnections.get(userId);
	}

	public getSockets(): Map<string, WebSocketConnection> {
		return this.socketConnections;
	}
}
