import type { Express } from "express";
import type { SQLiteRepository } from "../infra/SQLiteRepository.js";
import type { DiscordIntegration } from "../services/DiscordIntegration.js";
import type { InMemorySocket } from "../websocket/infra/InMemorySocketConnections.js";
import { CallbackController } from "./CallbackRoute.js";
import { NotifyController } from "./NotifyRoute.js";
import { PlatformsController } from "./PlatformsRoute.js";

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

		const platformsController = new PlatformsController(this.sqliteRepository);

		app.get("/callback", (req, res) => callbackController.execute(req, res));
		app.post("/notify", (req, res) => notifyController.execute(req, res));
		app.get("/platforms", (req, res) => platformsController.execute(req, res));
	}
}
