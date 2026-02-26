import type WebSocket from "ws";
import { z } from "zod";
import type { RegisterUserService } from "../services/RegisterUserService.js";

const registerUserSchema = z.object({
	type: z.literal("register"),
	userId: z.string().min(1),
});

export class RegisterUserController {
	constructor(private readonly registerUserService: RegisterUserService) {}

	public execute(message: unknown, websocketConnection: WebSocket) {
		const parsed = registerUserSchema.safeParse(message);

		if (!parsed.success) {
			console.error("Invalid register message format: ", parsed.error);
			return;
		}

		const { userId } = parsed.data;

		this.registerUserService.execute(userId, websocketConnection);
	}
}
