import { Client, GatewayIntentBits } from "discord.js";
import { dotenvConfig } from "./DotEnvParser.js";

export type SendDirectMessageParams = {
	userId: string;
	message: string;
};

interface DiscordTokenResponse {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	refresh_token: string;
	scope: string;
}

interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	avatar: string | null;
	global_name: string | null;
}

export class DiscordIntegration {
	private discordClient: Client;

	constructor() {
		this.discordClient = new Client({
			intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
		});
	}

	async initialize() {
		await this.discordClient.login(process.env.DISCORD_BOT_TOKEN);

		if (!this.discordClient.user) {
			throw new Error("Failed to log in to Discord");
		}

		console.log("Bot logged in as:", this.discordClient.user.tag);
	}

	async sendDirectMessage({ userId, message }: SendDirectMessageParams) {
		try {
			const user = await this.discordClient.users.fetch(userId);

			console.log(`Attempting to send DM to user ${userId}`);

			await user.send(message);

			console.log("DM sent successfully");
		} catch (err) {
			console.error(`Failed to send DM to user: ${(err as Error).message}`);
		}
	}

	async exchangeOAuthCode(
		code: string,
	): Promise<{ discordId: string; username: string }> {
		const params = new URLSearchParams({
			client_id: dotenvConfig.DISCORD_CLIENT_ID,
			client_secret: dotenvConfig.DISCORD_CLIENT_SECRET,
			grant_type: "authorization_code",
			code,
			redirect_uri: dotenvConfig.REDIRECT_URI,
		});

		const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params,
		});

		if (!tokenRes.ok) {
			throw new Error(`Token request failed: ${tokenRes.status}`);
		}

		const tokenData = (await tokenRes.json()) as DiscordTokenResponse;

		if (!tokenData.access_token) {
			throw new Error("Failed to get access token");
		}

		const userRes = await fetch("https://discord.com/api/users/@me", {
			headers: {
				Authorization: `Bearer ${tokenData.access_token}`,
			},
		});

		if (!userRes.ok) {
			throw new Error(`User fetch failed: ${userRes.status}`);
		}

		const userData = (await userRes.json()) as DiscordUser;

		return {
			discordId: userData.id,
			username:
				userData.discriminator === "0"
					? userData.username
					: `${userData.username}#${userData.discriminator}`,
		};
	}
}
