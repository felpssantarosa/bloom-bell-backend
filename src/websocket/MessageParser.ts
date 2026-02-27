import type { RawData } from "ws";

type WebsocketMessage = Record<string, unknown>;

export const websocketMessageParser = (
	data: RawData,
): WebsocketMessage | null => {
	try {
		let text: string;

		if (typeof data === "string") text = data;
		else {
			if (!Buffer.isBuffer(data)) {
				text = Buffer.concat(data as Buffer[]).toString("utf8");
			} else {
				text = data.toString("utf8");
			}
		}

		const message = JSON.parse(text) as WebsocketMessage;

		if (
			typeof message !== "object" ||
			message === null ||
			Array.isArray(message)
		) {
			return null;
		}

		if (typeof message.type !== "string") {
			return null;
		}

		console.log("WS message received, type:", String(message.type));

		return message;
	} catch (err) {
		console.error(
			"Error parsing websocket message, data:",
			data,
			"error:",
			(err as Error).message,
		);
		return null;
	}
};
