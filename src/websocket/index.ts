import type WebSocket from "ws";
import { WebSocketServer } from "ws";
import type { RegisterUserController } from "./controllers/RegisterUserController.js";
import { websocketMessageParser } from "./message-parser.js";

export class WebsocketManager {
	private readonly webSocketServer: WebSocketServer;
	private readonly Router;

	constructor(
		private readonly RegisterUserController: RegisterUserController,
		private readonly WS_PORT: number,
	) {
		this.webSocketServer = new WebSocketServer({ port: this.WS_PORT });
		this.Router = {
			register: this.RegisterUserController,
		};
	}

	public start() {
		this.webSocketServer.on(
			"connection",
			(websocketConnection: WebSocket, request) => {
				console.log("🔌 Plugin connected via WebSocket");
				console.log("Remote: ", request.socket.remoteAddress);

				websocketConnection.on("message", (data: WebSocket.RawData) => {
					const message = websocketMessageParser(data);

					if (!message) {
						console.log("Received invalid message, ignoring.");
						return;
					}

					const controller =
						this.Router[message.type as keyof typeof this.Router];

					if (!controller) {
						console.error(
							"No controller found for message type:",
							message.type,
						);
						return;
					}

					controller.execute(message, websocketConnection);
				});

				websocketConnection.on("error", (err: Error) => {
					console.error("WebSocket ERROR:", err);
				});
			},
		);
	}
}
