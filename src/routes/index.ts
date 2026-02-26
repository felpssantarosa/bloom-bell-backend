import type { Express } from "express";
import type { SQLiteRepository } from "../infra/SQLiteRepository.js";
import type { DiscordIntegration } from "../services/DiscordIntegration.js";
import type { InMemorySocket } from "../websocket/infra/inMemorySocketConnections.js";
import { CallbackController } from "./callback.js";
import { NotifyController } from "./notify.js";

export class Router {
	constructor(
		private readonly sqliteRepository: SQLiteRepository,
		private readonly inMemorySocket: InMemorySocket,
		private readonly discordIntegration: DiscordIntegration,
	) {}

	public registerRoutes(app: Express) {
		const callbackController = new CallbackController(
			this.inMemorySocket,
			this.sqliteRepository,
			this.discordIntegration,
		);

		const notifyController = new NotifyController(
			this.sqliteRepository,
			this.discordIntegration,
		);

		app.use("/callback", callbackController.execute);
		app.use("/notify", notifyController.execute);
	}
}
