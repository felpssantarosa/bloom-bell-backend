import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscordIntegration } from "../../src/services/DiscordIntegration.js";

const mockLogin = vi.fn();
const mockUsersFetch = vi.fn();
let mockUser: { tag: string } | null = null;

vi.mock("discord.js", async (importOriginal) => {
	const original = await importOriginal<typeof import("discord.js")>();
	return {
		...original,
		Client: class MockClient {
			login = mockLogin;
			users = { fetch: mockUsersFetch };
			get user() {
				return mockUser;
			}
		},
	};
});

vi.mock("../../src/services/DotEnvParser.js", () => ({
	dotenvConfig: {
		DISCORD_CLIENT_ID: "test-client-id",
		DISCORD_CLIENT_SECRET: "test-client-secret",
		DISCORD_BOT_TOKEN: "test-bot-token",
		REDIRECT_URI: "http://localhost:3333/callback",
		PORT: "3333",
		WS_PORT: "3334",
		ALLOWED_ORIGINS: "",
	},
}));

describe("DiscordIntegration", () => {
	let discord: DiscordIntegration;

	beforeEach(() => {
		vi.clearAllMocks();
		mockUser = null;
		discord = new DiscordIntegration();
	});

	describe("initialize", () => {
		it("logs in to Discord successfully", async () => {
			mockLogin.mockResolvedValue(undefined);
			mockUser = { tag: "TestBot#1234" };

			await discord.initialize();

			expect(mockLogin).toHaveBeenCalledWith(process.env.DISCORD_BOT_TOKEN);
		});

		it("throws when login fails (no user)", async () => {
			mockLogin.mockResolvedValue(undefined);
			mockUser = null;

			await expect(discord.initialize()).rejects.toThrow(
				"Failed to log in to Discord",
			);
		});
	});

	describe("sendDirectMessage", () => {
		it("sends a DM to the specified user", async () => {
			const mockDiscordUser = { send: vi.fn().mockResolvedValue(undefined) };
			mockUsersFetch.mockResolvedValue(mockDiscordUser);

			await discord.sendDirectMessage({
				userId: "user123",
				message: "Hello!",
			});

			expect(mockUsersFetch).toHaveBeenCalledWith("user123");
			expect(mockDiscordUser.send).toHaveBeenCalledWith("Hello!");
		});

		it("handles DM send failure gracefully", async () => {
			mockUsersFetch.mockRejectedValue(new Error("User not found"));

			await expect(
				discord.sendDirectMessage({
					userId: "baduser",
					message: "Hello!",
				}),
			).resolves.toBeUndefined();
		});
	});

	describe("exchangeOAuthCode", () => {
		it("exchanges code for Discord user info", async () => {
			const mockTokenResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					access_token: "test-access-token",
					token_type: "Bearer",
					expires_in: 604800,
					refresh_token: "test-refresh",
					scope: "identify",
				}),
			};

			const mockUserResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					id: "discord456",
					username: "testplayer",
					discriminator: "0",
					avatar: null,
					global_name: "TestPlayer",
				}),
			};

			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValueOnce(
					mockTokenResponse as unknown as globalThis.Response,
				)
				.mockResolvedValueOnce(
					mockUserResponse as unknown as globalThis.Response,
				);

			const result = await discord.exchangeOAuthCode("authcode123");

			expect(result).toEqual({
				discordId: "discord456",
				username: "testplayer",
			});

			expect(fetchSpy).toHaveBeenCalledWith(
				"https://discord.com/api/oauth2/token",
				expect.objectContaining({ method: "POST" }),
			);
			expect(fetchSpy).toHaveBeenCalledWith(
				"https://discord.com/api/users/@me",
				expect.objectContaining({
					headers: { Authorization: "Bearer test-access-token" },
				}),
			);

			fetchSpy.mockRestore();
		});

		it("returns username#discriminator when discriminator is not 0", async () => {
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						access_token: "tok",
						token_type: "Bearer",
					}),
				} as unknown as globalThis.Response)
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						id: "disc789",
						username: "olduser",
						discriminator: "1234",
						avatar: null,
						global_name: null,
					}),
				} as unknown as globalThis.Response);

			const result = await discord.exchangeOAuthCode("code");
			expect(result.username).toBe("olduser#1234");

			fetchSpy.mockRestore();
		});

		it("throws when token request fails", async () => {
			const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
				ok: false,
				status: 401,
			} as unknown as globalThis.Response);

			await expect(discord.exchangeOAuthCode("badcode")).rejects.toThrow(
				"Token request failed: 401",
			);

			fetchSpy.mockRestore();
		});

		it("throws when access_token is missing from response", async () => {
			const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue({}),
			} as unknown as globalThis.Response);

			await expect(discord.exchangeOAuthCode("code")).rejects.toThrow(
				"Failed to get access token",
			);

			fetchSpy.mockRestore();
		});

		it("throws when user fetch fails", async () => {
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						access_token: "tok",
					}),
				} as unknown as globalThis.Response)
				.mockResolvedValueOnce({
					ok: false,
					status: 403,
				} as unknown as globalThis.Response);

			await expect(discord.exchangeOAuthCode("code")).rejects.toThrow(
				"User fetch failed: 403",
			);

			fetchSpy.mockRestore();
		});
	});
});
