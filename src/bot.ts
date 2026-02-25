import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

export const bot = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

export async function startBot() {
	await bot.login(process.env.DISCORD_BOT_TOKEN);
	console.log("Bot logged in as:", bot.user?.tag);
}

export async function sendDM(userId: string, message: string) {
	try {
		const user = await bot.users.fetch(userId);
		await user.send(message);
		console.log(`DM sent to ${userId}`);
	} catch (err) {
		console.error("Failed to send DM:", err);
	}
}
