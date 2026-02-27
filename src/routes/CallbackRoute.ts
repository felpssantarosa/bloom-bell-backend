import type { Request, Response } from "express";
import { callbackQuerySchema } from "../validation/schemas.js";
import type { OAuthErrorHandler } from "./callbacks/OAuthErrorHandler.js";
import type { OAuthSuccessHandler } from "./callbacks/OAuthSuccessHandler.js";

export class CallbackController {
	constructor(
		private readonly oauthSuccessHandler: OAuthSuccessHandler,
		private readonly oauthErrorHandler: OAuthErrorHandler,
	) {}

	public async execute(req: Request, res: Response) {
		const parsed = callbackQuerySchema.safeParse(req.query);

		if (!parsed.success) {
			return res.status(400).json({
				error: "Invalid request parameters",
				details: parsed.error.issues.map((i) => i.message),
			});
		}

		const data = parsed.data;

		if ("code" in data) {
			return this.oauthSuccessHandler.execute(
				{ code: data.code, pluginUserId: data.state },
				res,
			);
		}

		return this.oauthErrorHandler.execute(
			{
				error: data.error,
				errorDescription: data.error_description,
				pluginUserId: data.state,
			},
			res,
		);
	}
}
