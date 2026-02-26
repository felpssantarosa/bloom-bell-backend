import { SQLiteRepository } from "./infra/SQLiteRepository.js";
import { Router } from "./routes/index.js";
import { DiscordIntegration } from "./services/DiscordIntegration.js";
import { dotenvConfig } from "./services/DotEnvParser.js";
import { RegisterUserController } from "./websocket/controllers/RegisterUserController.js";
import { WebsocketManager } from "./websocket/index.js";
import { InMemorySocket } from "./websocket/infra/InMemorySocketConnections.js";
import { ClosedWebSocketHandlerService } from "./websocket/services/ClosedWebSocketHandlerService.js";
import { RegisterUserService } from "./websocket/services/RegisterUserService.js";
import { RegisterWebSocketService } from "./websocket/services/RegisterWebSocketConnection.js";

const inMemorySocket = new InMemorySocket();
const closedWebSocketHandlerService = new ClosedWebSocketHandlerService(
	inMemorySocket,
);
const registerWebSocketService = new RegisterWebSocketService(
	inMemorySocket,
	closedWebSocketHandlerService,
);
const sqliteRepository = new SQLiteRepository();
const registerUserService = new RegisterUserService(
	registerWebSocketService,
	sqliteRepository,
);
const registerUserController = new RegisterUserController(registerUserService);
const websocketManager: WebsocketManager = new WebsocketManager(
	registerUserController,
	Number(dotenvConfig.WS_PORT) || 3334,
);

const discordIntegration = new DiscordIntegration();
const router = new Router(sqliteRepository, inMemorySocket, discordIntegration);

export { websocketManager, router, discordIntegration };
