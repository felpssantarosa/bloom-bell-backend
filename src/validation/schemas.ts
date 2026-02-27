import { z } from "zod";

function sanitizeString(val: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: <>
	return val.trim().replace(/[\x00-\x1F\x7F]/g, "");
}

const sanitizedString = z.string().transform(sanitizeString);

export const pluginUserIdSchema = sanitizedString.pipe(
	z
		.string()
		.min(1, "pluginUserId is required")
		.max(64, "pluginUserId must not exceed 64 characters")
		.regex(
			/^[a-zA-Z0-9_-]+$/,
			"pluginUserId must only contain alphanumeric characters, hyphens, and underscores",
		),
);

export const oauthCodeSchema = sanitizedString.pipe(
	z
		.string()
		.min(1, "OAuth code is required")
		.max(64, "OAuth code must not exceed 64 characters")
		.regex(/^[a-zA-Z0-9]+$/, "Invalid OAuth code format"),
);

export const notifyBodySchema = z.object({
	pluginUserId: pluginUserIdSchema,
	partySize: z.number().int().min(1).max(99).optional(),
	maxSize: z.number().int().min(1).max(99).optional(),
});

export const callbackQuerySchema = z.object({
	code: oauthCodeSchema,
	state: pluginUserIdSchema,
});

export const platformsQuerySchema = z.object({
	userId: pluginUserIdSchema,
});
