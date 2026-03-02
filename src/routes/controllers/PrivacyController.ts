import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";
import { Logger } from "../../services/Logger.js";

export class PrivacyController {
	private readonly logger = new Logger("PrivacyController");

	public execute(_req: Request, res: Response) {
		const __dirname = path.dirname(fileURLToPath(import.meta.url));

		const filePath = path.resolve(
			__dirname,
			"..",
			"..",
			"public",
			"privacy.html",
		);
		res.status(200).sendFile(filePath, (err) => {
			if (err) {
				this.logger.error("Failed to send privacy file", err);
				res.status(500).json({ error: "Failed to load Privacy Policy" });
			}
		});
	}
}
