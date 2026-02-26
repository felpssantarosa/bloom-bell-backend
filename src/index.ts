import express from "express";
import {
	discordIntegration,
	router,
	websocketManager,
} from "./depedency-injection.js";
import { dotenvConfig } from "./services/DotEnvParser.js";

const app = express();
const APP_PORT = Number(dotenvConfig.PORT) || 3000;
const WS_PORT = Number(dotenvConfig.WS_PORT) || 3334;

websocketManager.start();
app.use(express.json());

router.registerRoutes(app);

async function main() {
	await discordIntegration.initialize();

	app.listen(APP_PORT, () => {
		console.log(`HTTP backend running on http://localhost:${APP_PORT}`);
		console.log(`WebSocket server running on websocket://localhost:${WS_PORT}`);
	});
}

main();
