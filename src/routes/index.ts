import type { Express } from "express";
import rateLimit from "express-rate-limit";
import type { SQLiteRepository } from "../infra/SQLiteRepository.js";
import type { DiscordIntegration } from "../services/DiscordIntegration.js";
import type { InMemorySocket } from "../websocket/infra/InMemorySocketConnections.js";
import { CallbackController } from "./controllers/CallbackController.js";
import { DisconnectController } from "./controllers/DisconnectController.js";
import { NotifyController } from "./controllers/NotifyController.js";
import { PlatformsController } from "./controllers/PlatformsController.js";
import { PrivacyController } from "./controllers/PrivacyController.js";
import { TermsController } from "./controllers/TermsController.js";
import { DisconnectService } from "./services/DisconnectService.js";
import { NotifyService } from "./services/NotifyService.js";
import { OAuthErrorHandler } from "./services/OAuthErrorHandler.js";
import { OAuthSuccessHandler } from "./services/OAuthSuccessHandler.js";
import { PlatformsService } from "./services/PlatformsService.js";

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

		const notifyService = new NotifyService(
			this.sqliteRepository,
			this.discordIntegration,
		);
		const notifyController = new NotifyController(notifyService);

		const platformsService = new PlatformsService(this.sqliteRepository);
		const platformsController = new PlatformsController(platformsService);

		const disconnectService = new DisconnectService(this.sqliteRepository);
		const disconnectController = new DisconnectController(disconnectService);

		const termsController = new TermsController();

		const privacyController = new PrivacyController();

		app.get("/callback", (req, res) => callbackController.execute(req, res));
		app.post("/notify", notifyRateLimiter, (req, res) =>
			notifyController.execute(req, res),
		);
		app.get("/platforms", (req, res) => platformsController.execute(req, res));
		app.get("/terms", (req, res) => termsController.execute(req, res));
		app.get("/privacy", (req, res) => privacyController.execute(req, res));
		app.post("/disconnect", (req, res) =>
			disconnectController.execute(req, res),
		);
	}
}
