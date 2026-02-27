import type { Express } from "express";
import rateLimit from "express-rate-limit";
import type { SQLiteRepository } from "../infra/SQLiteRepository.js";
import type { DiscordIntegration } from "../services/DiscordIntegration.js";
import type { InMemorySocket } from "../websocket/infra/InMemorySocketConnections.js";
import { CallbackController } from "./CallbackRoute.js";
import { OAuthErrorHandler } from "./callbacks/OAuthErrorHandler.js";
import { OAuthSuccessHandler } from "./callbacks/OAuthSuccessHandler.js";
import { NotifyController } from "./NotifyRoute.js";
import { PlatformsController } from "./PlatformsRoute.js";

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

const notifyRateLimiter = rateLimit({
	windowMs: FIFTEEN_MINUTES_IN_MS,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Too many notification requests, please try again later" },
});

export class Router {
	constructor(
		private readonly sqliteRepository: SQLiteRepository,
		private readonly inMemorySocket: InMemorySocket,
		private readonly discordIntegration: DiscordIntegration,
	) {}

	public registerRoutes(app: Express) {
		const oauthSuccessHandler = new OAuthSuccessHandler(
			this.inMemorySocket,
			this.sqliteRepository,
			this.discordIntegration,
		);

		const oauthErrorHandler = new OAuthErrorHandler(this.inMemorySocket);

		const callbackController = new CallbackController(
			oauthSuccessHandler,
			oauthErrorHandler,
		);

		const notifyController = new NotifyController(
			this.sqliteRepository,
			this.discordIntegration,
		);

		const platformsController = new PlatformsController(this.sqliteRepository);

		app.get("/callback", (req, res) => callbackController.execute(req, res));
		app.post("/notify", notifyRateLimiter, (req, res) =>
			notifyController.execute(req, res),
		);
		app.get("/platforms", (req, res) => platformsController.execute(req, res));
	}
}
