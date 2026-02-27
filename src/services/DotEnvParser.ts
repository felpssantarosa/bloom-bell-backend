import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
	DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
	DISCORD_CLIENT_SECRET: z.string().min(1, "DISCORD_CLIENT_SECRET is required"),
	DISCORD_BOT_TOKEN: z.string().min(1, "DISCORD_BOT_TOKEN is required"),
	REDIRECT_URI: z.url("REDIRECT_URI must be a valid URL"),
	PORT: z.string().regex(/^\d+$/, "PORT must be numeric").default("3333"),
	WS_PORT: z.string().regex(/^\d+$/, "WS_PORT must be numeric").default("3334"),
	ALLOWED_ORIGINS: z
		.string()
		.default("")
		.describe("Comma-separated list of allowed CORS origins"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Invalid environment configuration:");
	for (const issue of parsed.error.issues) {
		console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
	}
	process.exit(1);
}

export const dotenvConfig = parsed.data;
