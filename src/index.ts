import express from "express";
import { SQLiteRepository } from "./infra/SQLiteRepository.js";
import { Router } from "./routes/index.js";
import { DiscordIntegration } from "./services/DiscordIntegration.js";
import { dotenvConfig } from "./services/DotEnvParser.js";
import { InMemorySocket } from "./websocket/infra/inMemorySocketConnections.js";

const app = express();
const APP_PORT = Number(dotenvConfig.PORT) || 3000;
const WS_PORT = Number(dotenvConfig.WS_PORT) || 3334;

app.use(express.json());

const discordIntegration = new DiscordIntegration();
const sqliteRepository = new SQLiteRepository();
const inMemorySocket = new InMemorySocket();
const router = new Router(sqliteRepository, inMemorySocket, discordIntegration);

router.registerRoutes(app);

async function main() {
	await discordIntegration.initialize();

	app.listen(APP_PORT, () => {
		console.log(`HTTP backend running on http://localhost:${APP_PORT}`);
		console.log(`WebSocket server running on websocket://localhost:${WS_PORT}`);
	});
}

main();
