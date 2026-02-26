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
			}

			text = data.toString("utf8");
		}

		const message = JSON.parse(text) as WebsocketMessage;

		console.log("📨 WS message received:", message);

		return message;
	} catch (err) {
		console.error("Error parsing JSON from websocket message:", err);
		return null;
	}
};
