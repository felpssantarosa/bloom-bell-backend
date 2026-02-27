import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { dotenvConfig } from "../services/DotEnvParser.js";

/**
 * Middleware that validates the X-API-Key header against the configured API_KEY.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
	const apiKey = req.headers["x-api-key"];

	if (
		typeof apiKey !== "string" ||
		!timingSafeEqual(apiKey, dotenvConfig.API_KEY)
	) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	next();
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;

	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);

	return crypto.timingSafeEqual(bufA, bufB);
}
