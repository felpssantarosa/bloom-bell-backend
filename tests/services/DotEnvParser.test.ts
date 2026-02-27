import { beforeEach, describe, expect, it, vi } from "vitest";

describe("DotEnvParser", () => {
	beforeEach(() => {
		vi.resetModules();

		vi.mock("dotenv", () => ({
			default: { config: vi.fn() },
		}));
	});

	it("parses valid environment variables", async () => {
		vi.stubEnv("DISCORD_CLIENT_ID", "test-id");
		vi.stubEnv("DISCORD_CLIENT_SECRET", "test-secret");
		vi.stubEnv("DISCORD_BOT_TOKEN", "test-token");
		vi.stubEnv("REDIRECT_URI", "http://localhost:3333/callback");
		vi.stubEnv("PORT", "3333");
		vi.stubEnv("WS_PORT", "3334");
		vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000");

		const { dotenvConfig } = await import("../../src/services/DotEnvParser.js");

		expect(dotenvConfig.DISCORD_CLIENT_ID).toBe("test-id");
		expect(dotenvConfig.DISCORD_CLIENT_SECRET).toBe("test-secret");
		expect(dotenvConfig.DISCORD_BOT_TOKEN).toBe("test-token");
		expect(dotenvConfig.REDIRECT_URI).toBe("http://localhost:3333/callback");
		expect(dotenvConfig.PORT).toBe("3333");
		expect(dotenvConfig.WS_PORT).toBe("3334");
		expect(dotenvConfig.ALLOWED_ORIGINS).toBe("http://localhost:3000");

		vi.unstubAllEnvs();
	});

	it("uses default values for PORT and WS_PORT", async () => {
		vi.stubEnv("DISCORD_CLIENT_ID", "test-id");
		vi.stubEnv("DISCORD_CLIENT_SECRET", "test-secret");
		vi.stubEnv("DISCORD_BOT_TOKEN", "test-token");
		vi.stubEnv("REDIRECT_URI", "http://localhost:3333/callback");

		delete process.env.PORT;
		delete process.env.WS_PORT;
		vi.stubEnv("ALLOWED_ORIGINS", "");

		const { dotenvConfig } = await import("../../src/services/DotEnvParser.js");

		expect(dotenvConfig.PORT).toBe("3333");
		expect(dotenvConfig.WS_PORT).toBe("3334");

		vi.unstubAllEnvs();
	});

	it("exits process when required env vars are missing", async () => {
		delete process.env.DISCORD_CLIENT_ID;
		delete process.env.DISCORD_CLIENT_SECRET;
		delete process.env.DISCORD_BOT_TOKEN;
		delete process.env.REDIRECT_URI;

		const exitSpy = vi
			.spyOn(process, "exit")
			.mockImplementation((() => {}) as unknown as typeof process.exit);

		try {
			await import("../../src/services/DotEnvParser.js");
		} catch {}

		expect(exitSpy).toHaveBeenCalledWith(1);
		exitSpy.mockRestore();
		vi.unstubAllEnvs();
	});

	it("rejects non-numeric PORT", async () => {
		vi.stubEnv("DISCORD_CLIENT_ID", "test-id");
		vi.stubEnv("DISCORD_CLIENT_SECRET", "test-secret");
		vi.stubEnv("DISCORD_BOT_TOKEN", "test-token");
		vi.stubEnv("REDIRECT_URI", "http://localhost:3333/callback");
		vi.stubEnv("PORT", "not-a-number");

		const exitSpy = vi
			.spyOn(process, "exit")
			.mockImplementation((() => {}) as unknown as typeof process.exit);

		try {
			await import("../../src/services/DotEnvParser.js");
		} catch {}

		expect(exitSpy).toHaveBeenCalledWith(1);
		exitSpy.mockRestore();
		vi.unstubAllEnvs();
	});

	it("rejects invalid REDIRECT_URI", async () => {
		vi.stubEnv("DISCORD_CLIENT_ID", "test-id");
		vi.stubEnv("DISCORD_CLIENT_SECRET", "test-secret");
		vi.stubEnv("DISCORD_BOT_TOKEN", "test-token");
		vi.stubEnv("REDIRECT_URI", "not-a-url");

		const exitSpy = vi
			.spyOn(process, "exit")
			.mockImplementation((() => {}) as unknown as typeof process.exit);

		try {
			await import("../../src/services/DotEnvParser.js");
		} catch {}

		expect(exitSpy).toHaveBeenCalledWith(1);
		exitSpy.mockRestore();
		vi.unstubAllEnvs();
	});
});
