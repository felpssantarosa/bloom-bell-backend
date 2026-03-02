import path from "node:path";
import type { Request, Response } from "express";
import { Logger } from "../../services/Logger.js";

export class TermsController {
	private readonly logger = new Logger("TermsController");

	public execute(_req: Request, res: Response) {
		const filePath = path.resolve(process.cwd(), "src", "public", "terms.html");
		res.status(200).sendFile(filePath, (err) => {
			if (err) {
				this.logger.error("Failed to send terms file", err);
				res.status(500).json({ error: "Failed to load Terms of Service" });
			}
		});
	}
}
