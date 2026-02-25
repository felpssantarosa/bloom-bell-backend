import express, { type Request, type Response } from "express";
import { WebSocket, WebSocketServer } from "ws";
import { sendDM, startBot } from "./bot.js";
import { getDiscordId, linkUser } from "./database.js";
import { dotenvConfig } from "./dotenv-parser.js";
import { exchangeCodeForUser } from "./oauth.js";

const app = express();
const APP_PORT = Number(dotenvConfig.PORT) || 3000;
const WS_PORT = Number(dotenvConfig.WS_PORT) || 3334;

app.use(express.json());

const pluginSockets = new Map<string, WebSocket>();
const pendingAuthEvents = new Set<string>(); // cache authComplete if WS not ready

const webSocketServer = new WebSocketServer({ port: WS_PORT });

webSocketServer.on("connection", (websocket: WebSocket, request) => {
	console.log("🔌 Plugin connected via WebSocket");
	console.log("Remote:", request.socket.remoteAddress);

	let registeredPluginId: string | undefined;

	websocket.on("message", (data: WebSocket.RawData) => {
		try {
			const message = JSON.parse(data.toString());
			console.log("📨 WS message received:", message);

			if (message.type === "register" && typeof message.userId === "string") {
				const id = message.userId;

				registeredPluginId = id;
				pluginSockets.set(id, websocket);

				console.log(`✅ Registered WS for plugin user: ${id}`);
				console.log("Active sockets:", [...pluginSockets.keys()]);

				const discordId = getDiscordId(id);

				if (discordId) {
					websocket.send(
						JSON.stringify({
							type: "authAlreadyLinked",
							provider: "discord",
							userId: id,
						}),
					);
				}
			}
		} catch (err) {
			console.error("WS message parse error:", err);
		}
	});

	websocket.on("close", (code, reason) => {
		console.log("WebSocket Closed");
		console.log("Code:", code);
		console.log("Reason:", reason.toString());

		if (registeredPluginId) {
			pluginSockets.delete(registeredPluginId);
			console.log(`Removed socket for ${registeredPluginId}`);
		}

		console.log("Active sockets after close:", [...pluginSockets.keys()]);
	});

	websocket.on("error", (err: Error) => {
		console.error("WebSocket ERROR:", err);
	});
});

app.get("/callback", async (req: Request, res: Response) => {
	const code = req.query.code;
	const state = req.query.state; // pluginUserId

	if (typeof code !== "string" || typeof state !== "string") {
		return res.status(400).send("Missing code or state");
	}

	try {
		const user = await exchangeCodeForUser(code);

		linkUser(state, user.discordId);

		console.log(`Linked plugin user ${state} -> Discord ${user.discordId}`);

		await sendDM(
			user.discordId,
			"✅ Your FFXIV plugin has been successfully linked!",
		);

		const socket = pluginSockets.get(state);

		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(
				JSON.stringify({
					type: "authComplete",
					provider: "discord",
					pluginUserId: state,
				}),
			);
			console.log(`Sent authComplete WS event to ${state}`);
		} else {
			pendingAuthEvents.add(state);
			console.log(`WS not active for ${state}, caching authComplete event`);
		}

		res.json({ message: "Account linked! You can close this window." });
	} catch (err) {
		console.error("OAuth error:", err);
		res.status(500).send("OAuth failed");
	}
});

app.post("/notify", async (req: Request, res: Response) => {
	const { pluginUserId, partySize, maxSize } = req.body as {
		pluginUserId?: string;
		partySize?: number;
		maxSize?: number;
	};

	if (!pluginUserId) {
		return res.status(400).json({ error: "Missing pluginUserId" });
	}

	try {
		const discordId = getDiscordId(pluginUserId);

		if (!discordId) {
			return res.status(404).json({ error: "User not linked to Discord" });
		}

		if (
			partySize !== undefined &&
			maxSize !== undefined &&
			partySize < maxSize
		) {
			return res.json({ status: "Party not full yet" });
		}

		await sendDM(discordId, "🎉 Your party is full! Time to queue!");
		console.log(`Sent party full DM to ${discordId}`);

		return res.json({ status: "Notification sent" });
	} catch (err) {
		console.error("Notify error:", err);
		return res.status(500).json({ error: "Internal server error" });
	}
});

async function main() {
	await startBot();

	app.listen(APP_PORT, () => {
		console.log(`HTTP backend running on http://localhost:${APP_PORT}`);
		console.log(`WebSocket server running on websocket://localhost:${WS_PORT}`);
	});
}

main();
