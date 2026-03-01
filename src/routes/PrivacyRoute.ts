import type { Request, Response } from "express";
import path from "path";

export class PrivacyController {
	public execute(_req: Request, res: Response) {
		const filePath = path.resolve(
			process.cwd(),
			"src",
			"public",
			"privacy.html",
		);
		res.status(200).sendFile(filePath, (err) => {
			if (err) {
				console.error("Failed to send privacy file:", err);
				res.status(500).json({ error: "Failed to load Privacy Policy" });
			}
		});
	}
}
