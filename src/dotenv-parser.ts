import dotenv from "dotenv";

dotenv.config();

export const dotenvConfig = {
	DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
	DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "",
	DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || "",
	REDIRECT_URI: process.env.REDIRECT_URI || "",
	PORT: process.env.PORT || "3333",
};
