import type { Request, Response } from "express";
import path from "path";

export class TermsController {
	public execute(_req: Request, res: Response) {
		const filePath = path.resolve(process.cwd(), "src", "public", "terms.html");
		res.status(200).sendFile(filePath, (err) => {
			if (err) {
				console.error("Failed to send terms file:", err);
				res.status(500).json({ error: "Failed to load Terms of Service" });
			}
		});
	}
}
