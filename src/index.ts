import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import {
	discordIntegration,
	router,
	websocketManager,
} from "./DepedencyInjection.js";
import { dotenvConfig } from "./services/DotEnvParser.js";

const app = express();
const APP_PORT = Number(dotenvConfig.PORT) || 3000;
const WS_PORT = Number(dotenvConfig.WS_PORT) || 3334;
const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

const rateLimiter = rateLimit({
	windowMs: FIFTEEN_MINUTES_IN_MS,
	max: 25,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Too many requests, please try again later" },
});
const allowedOrigins = dotenvConfig.ALLOWED_ORIGINS
	? dotenvConfig.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
	: [];

app.set("trust proxy", true);
app.use(helmet());
app.use(
	cors({
		origin: allowedOrigins.length > 0 ? allowedOrigins : false,
		methods: ["GET", "POST"],
		allowedHeaders: ["Content-Type", "Authorization"],
	}),
);
app.use(rateLimiter);
app.use(express.json({ limit: "16kb" }));
app.disable("x-powered-by");

websocketManager.start();

router.registerRoutes(app);

async function main() {
	await discordIntegration.initialize();

	app.listen(APP_PORT, () => {
		console.log(`HTTP backend running on port ${APP_PORT}`);
		console.log(`WebSocket server running on port ${WS_PORT}`);
	});
}

main();

export { app };
