import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import { sendDM, startBot } from "./bot.js";
import { getDiscordId, linkUser } from "./database.js";
import { exchangeCodeForUser } from "./oauth.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/callback", async (req: Request, res: Response) => {
	const code = req.query.code;
	const state = req.query.state;

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

		if (partySize !== undefined && maxSize !== undefined) {
			if (partySize < maxSize) {
				return res.json({ status: "Party not full yet" });
			}
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

	app.listen(PORT, () => {
		console.log(`Backend running on http://localhost:${PORT}`);
	});
}

main();
