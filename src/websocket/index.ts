import type WebSocket from "ws";
import { WebSocketServer } from "ws";
import { Logger } from "../services/Logger.js";
import type { RegisterUserController } from "./controllers/RegisterUserController.js";
import { websocketMessageParser } from "./MessageParser.js";

const MAX_WS_CONNECTIONS = 1000;
const MAX_MESSAGE_SIZE_BYTES = 4 * 1024;
const HEARTBEAT_INTERVAL_MS = 30_000;

export class WebsocketManager {
	private readonly webSocketServer: WebSocketServer;
	private readonly Router;
	private readonly logger = new Logger("WebsocketManager");
	private activeConnections = 0;

	constructor(
		private readonly RegisterUserController: RegisterUserController,
		private readonly WS_PORT: number,
	) {
		this.webSocketServer = new WebSocketServer({
			port: this.WS_PORT,
			maxPayload: MAX_MESSAGE_SIZE_BYTES,
		});
		this.Router = {
			register: this.RegisterUserController,
		};
	}

	public start() {
		const heartbeat = setInterval(() => {
			for (const client of this.webSocketServer.clients) {
				if ((client as WebSocket & { isAlive?: boolean }).isAlive === false) {
					client.terminate();
					continue;
				}
				(client as WebSocket & { isAlive?: boolean }).isAlive = false;
				client.ping();
			}
		}, HEARTBEAT_INTERVAL_MS);

		this.webSocketServer.on("close", () => clearInterval(heartbeat));

		this.webSocketServer.on(
			"connection",
			(websocketConnection: WebSocket, _request) => {
				if (this.activeConnections >= MAX_WS_CONNECTIONS) {
					this.logger.warn(
						"WebSocket connection limit reached, rejecting new connection",
					);
					websocketConnection.close(1013, "Server overloaded");
					return;
				}

				this.activeConnections++;
				(websocketConnection as WebSocket & { isAlive?: boolean }).isAlive =
					true;

				websocketConnection.on("pong", () => {
					(websocketConnection as WebSocket & { isAlive?: boolean }).isAlive =
						true;
				});

				this.logger.info(
					`WebSocket connection established (active: ${this.activeConnections})`,
				);

				let messageCount = 0;
				const MESSAGE_RATE_LIMIT = 30;
				const RATE_LIMIT_WINDOW_MS = 60_000;

				const rateLimitReset = setInterval(() => {
					messageCount = 0;
				}, RATE_LIMIT_WINDOW_MS);

				websocketConnection.on("message", (data: WebSocket.RawData) => {
					messageCount++;
					if (messageCount > MESSAGE_RATE_LIMIT) {
						this.logger.warn(
							"WebSocket message rate limit exceeded, closing connection",
						);
						websocketConnection.close(1008, "Rate limit exceeded");
						return;
					}

					const message = websocketMessageParser(data);

					if (!message) {
						this.logger.warn(
							"Received unparseable WebSocket message, ignoring",
						);
						return;
					}

					const controller =
						this.Router[message.type as keyof typeof this.Router];

					if (!controller) {
						this.logger.warn("No controller found for WebSocket message type");
						this.logger.debug("Unknown message type", String(message.type));
						return;
					}

					controller.execute(message, websocketConnection);
				});

				websocketConnection.on("close", () => {
					this.activeConnections--;
					clearInterval(rateLimitReset);
				});

				websocketConnection.on("error", (err: Error) => {
					this.logger.error("WebSocket connection error", err);
				});
			},
		);
	}
}
