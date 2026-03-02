import type { Response } from "express";
import type {
	SQLiteRepository,
	UnlinkResult,
} from "../../infra/SQLiteRepository.js";
import { Logger } from "../../services/Logger.js";

type DisconnectParams = {
	pluginUserId: string;
	platform?: string | undefined;
};

export class DisconnectService {
	private readonly logger = new Logger("DisconnectService");

	constructor(private readonly sqliteRepository: SQLiteRepository) {}

	public execute({ pluginUserId, platform }: DisconnectParams, res: Response) {
		const targetPlatform = platform ?? "discord";

		try {
			const result: UnlinkResult = this.sqliteRepository.unlinkPlatform(
				pluginUserId,
				targetPlatform,
			);

			if (result === "unsupported_platform") {
				return res
					.status(400)
					.json({ error: `Platform "${targetPlatform}" is not supported` });
			}

			if (result === "not_found") {
				return res
					.status(404)
					.json({ error: "No linked record found for given platform" });
			}

			this.logger.info("Platform unlinked");
			this.logger.debug("Unlinked plugin user from platform", {
				pluginUserId,
				platform: targetPlatform,
			});

			return res.json({ status: "Disconnected", platform: targetPlatform });
		} catch (err) {
			this.logger.error("Disconnect error occurred", err);
			return res.status(500).json({ error: "Internal server error" });
		}
	}
}
