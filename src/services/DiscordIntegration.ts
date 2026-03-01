import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	Client,
	GatewayIntentBits,
	InteractionContextType,
	REST,
	Routes,
	SlashCommandBuilder,
} from "discord.js";
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
		this.discordClient.on("interactionCreate", (interaction) => {
			if (!interaction.isChatInputCommand()) return;
			void this.handleCommand(interaction);
		});

		await this.discordClient.login(dotenvConfig.DISCORD_BOT_TOKEN);

		if (!this.discordClient.user) {
			throw new Error("Failed to log in to Discord");
		}

		console.log("Bot logged in as:", this.discordClient.user.tag);

		await this.registerCommands();
	}

	private async registerCommands() {
		const commands = [
			new SlashCommandBuilder()
				.setName("activate")
				.setDescription(
					"Set up your FFXIV plugin to receive Discord notifications",
				)
				.setIntegrationTypes(
					ApplicationIntegrationType.GuildInstall,
					ApplicationIntegrationType.UserInstall,
				)
				.setContexts(
					InteractionContextType.Guild,
					InteractionContextType.BotDM,
					InteractionContextType.PrivateChannel,
				)
				.toJSON(),
		];

		const rest = new REST().setToken(dotenvConfig.DISCORD_BOT_TOKEN);

		await rest.put(Routes.applicationCommands(dotenvConfig.DISCORD_CLIENT_ID), {
			body: commands,
		});

		console.log("Slash commands registered successfully");
	}

	private async handleCommand(interaction: ChatInputCommandInteraction) {
		if (interaction.commandName === "activate") {
			await interaction.reply({
				content:
					"✅ You're all set! Open the **Bloom Bell** plugin in FFXIV and click \"Link Discord\" to complete the setup. Once linked, you'll receive notifications here.",
				flags: ["Ephemeral"],
			});
		}
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
