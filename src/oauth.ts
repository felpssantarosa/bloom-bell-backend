import fetch from "node-fetch";
import { dotenvConfig } from "./dotenv-parser.js";

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

export async function exchangeCodeForUser(code: string) {
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