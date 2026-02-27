import { describe, expect, it } from "vitest";
import {
	callbackQuerySchema,
	notifyBodySchema,
	oauthCodeSchema,
	platformsQuerySchema,
	pluginUserIdSchema,
} from "../../src/validation/schemas.js";

describe("pluginUserIdSchema", () => {
	it("accepts valid alphanumeric IDs", () => {
		expect(pluginUserIdSchema.safeParse("user123").success).toBe(true);
		expect(pluginUserIdSchema.safeParse("my-user_42").success).toBe(true);
		expect(pluginUserIdSchema.safeParse("A").success).toBe(true);
	});

	it("trims whitespace", () => {
		const result = pluginUserIdSchema.safeParse("  user123  ");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe("user123");
	});

	it("strips control characters", () => {
		const result = pluginUserIdSchema.safeParse("user\x00123");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe("user123");
	});

	it("rejects empty string", () => {
		expect(pluginUserIdSchema.safeParse("").success).toBe(false);
	});

	it("rejects whitespace-only", () => {
		expect(pluginUserIdSchema.safeParse("   ").success).toBe(false);
	});

	it("rejects strings over 64 chars", () => {
		const long = "a".repeat(65);
		expect(pluginUserIdSchema.safeParse(long).success).toBe(false);
	});

	it("accepts strings exactly 64 chars", () => {
		const exact = "a".repeat(64);
		expect(pluginUserIdSchema.safeParse(exact).success).toBe(true);
	});

	it("rejects special characters", () => {
		expect(pluginUserIdSchema.safeParse("user<script>").success).toBe(false);
		expect(pluginUserIdSchema.safeParse("user;DROP TABLE").success).toBe(false);
		expect(pluginUserIdSchema.safeParse("user/path").success).toBe(false);
		expect(pluginUserIdSchema.safeParse("user@name").success).toBe(false);
	});

	it("rejects non-string values", () => {
		expect(pluginUserIdSchema.safeParse(123).success).toBe(false);
		expect(pluginUserIdSchema.safeParse(null).success).toBe(false);
		expect(pluginUserIdSchema.safeParse(undefined).success).toBe(false);
	});
});

describe("oauthCodeSchema", () => {
	it("accepts valid OAuth codes", () => {
		expect(oauthCodeSchema.safeParse("abc123DEF456").success).toBe(true);
	});

	it("rejects empty string", () => {
		expect(oauthCodeSchema.safeParse("").success).toBe(false);
	});

	it("rejects codes over 64 chars", () => {
		expect(oauthCodeSchema.safeParse("a".repeat(65)).success).toBe(false);
	});

	it("rejects codes with special characters", () => {
		expect(oauthCodeSchema.safeParse("code-with-dash").success).toBe(false);
		expect(oauthCodeSchema.safeParse("code with space").success).toBe(false);
		expect(oauthCodeSchema.safeParse("code=value").success).toBe(false);
	});
});

describe("notifyBodySchema", () => {
	it("accepts valid body with only pluginUserId", () => {
		const result = notifyBodySchema.safeParse({ pluginUserId: "user1" });
		expect(result.success).toBe(true);
	});

	it("accepts valid body with all fields", () => {
		const result = notifyBodySchema.safeParse({
			pluginUserId: "user1",
			partySize: 4,
			maxSize: 8,
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing pluginUserId", () => {
		expect(notifyBodySchema.safeParse({}).success).toBe(false);
		expect(
			notifyBodySchema.safeParse({ partySize: 4, maxSize: 8 }).success,
		).toBe(false);
	});

	it("rejects non-integer partySize", () => {
		expect(
			notifyBodySchema.safeParse({
				pluginUserId: "user1",
				partySize: 4.5,
			}).success,
		).toBe(false);
	});

	it("rejects negative partySize", () => {
		expect(
			notifyBodySchema.safeParse({
				pluginUserId: "user1",
				partySize: -1,
			}).success,
		).toBe(false);
	});

	it("rejects partySize exceeding max", () => {
		expect(
			notifyBodySchema.safeParse({
				pluginUserId: "user1",
				partySize: 100,
			}).success,
		).toBe(false);
	});

	it("rejects non-integer maxSize", () => {
		expect(
			notifyBodySchema.safeParse({
				pluginUserId: "user1",
				maxSize: 8.1,
			}).success,
		).toBe(false);
	});

	it("rejects negative maxSize", () => {
		expect(
			notifyBodySchema.safeParse({
				pluginUserId: "user1",
				maxSize: 0,
			}).success,
		).toBe(false);
	});

	it("rejects pluginUserId with injection attempts", () => {
		expect(
			notifyBodySchema.safeParse({
				pluginUserId: "'; DROP TABLE linked_users; --",
			}).success,
		).toBe(false);
	});
});

describe("callbackQuerySchema", () => {
	it("accepts valid success callback query", () => {
		const result = callbackQuerySchema.safeParse({
			code: "abc123",
			state: "user42",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect("code" in result.data).toBe(true);
		}
	});

	it("accepts valid error callback query", () => {
		const result = callbackQuerySchema.safeParse({
			error: "access_denied",
			error_description: "The user denied the request",
			state: "user42",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect("error" in result.data).toBe(true);
		}
	});

	it("accepts error callback without description", () => {
		const result = callbackQuerySchema.safeParse({
			error: "access_denied",
			state: "user42",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing both code and error", () => {
		expect(callbackQuerySchema.safeParse({ state: "user42" }).success).toBe(
			false,
		);
	});

	it("rejects missing state", () => {
		expect(callbackQuerySchema.safeParse({ code: "abc123" }).success).toBe(
			false,
		);
	});

	it("rejects invalid code format", () => {
		expect(
			callbackQuerySchema.safeParse({
				code: "<script>alert(1)</script>",
				state: "user42",
			}).success,
		).toBe(false);
	});

	it("rejects invalid error format", () => {
		expect(
			callbackQuerySchema.safeParse({
				error: "<script>alert(1)</script>",
				state: "user42",
			}).success,
		).toBe(false);
	});
});

describe("platformsQuerySchema", () => {
	it("accepts valid userId", () => {
		const result = platformsQuerySchema.safeParse({ userId: "user42" });
		expect(result.success).toBe(true);
	});

	it("rejects missing userId", () => {
		expect(platformsQuerySchema.safeParse({}).success).toBe(false);
	});

	it("rejects userId with special characters", () => {
		expect(
			platformsQuerySchema.safeParse({ userId: "../etc/passwd" }).success,
		).toBe(false);
	});
});
