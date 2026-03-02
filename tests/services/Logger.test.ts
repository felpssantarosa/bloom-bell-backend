import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Logger", () => {
	let logSpy: ReturnType<typeof vi.spyOn>;
	let warnSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("info logs with correct format", async () => {
		const { Logger } = await import("../../src/services/Logger.js");
		new Logger("Ctx").info("hello");
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringMatching(/\[INFO\] \[Ctx\] hello/),
		);
	});

	it("debug logs in development mode (NODE_ENV=test)", async () => {
		const { Logger } = await import("../../src/services/Logger.js");
		new Logger("Ctx").debug("dbg msg", { foo: 1 });
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringMatching(/\[DEBUG\] \[Ctx\] dbg msg/),
			{ foo: 1 },
		);
	});

	it("debug is suppressed in production mode", async () => {
		vi.resetModules();
		vi.stubEnv("NODE_ENV", "production");
		const { Logger } = await import("../../src/services/Logger.js");
		new Logger("Ctx").debug("should not appear");
		expect(logSpy).not.toHaveBeenCalled();
	});

	it("warn logs with correct format", async () => {
		const { Logger } = await import("../../src/services/Logger.js");
		new Logger("Ctx").warn("watch out");
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringMatching(/\[WARN\] \[Ctx\] watch out/),
		);
	});

	it("error logs message and error object in development", async () => {
		const { Logger } = await import("../../src/services/Logger.js");
		const err = new Error("boom");
		new Logger("Ctx").error("something broke", err);
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/\[ERROR\] \[Ctx\] something broke/),
			err,
		);
	});

	it("error logs only message when no error is provided", async () => {
		const { Logger } = await import("../../src/services/Logger.js");
		new Logger("Ctx").error("empty error");
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/\[ERROR\] \[Ctx\] empty error/),
		);
	});

	it("error does not expose error object in production", async () => {
		vi.resetModules();
		vi.stubEnv("NODE_ENV", "production");
		const { Logger } = await import("../../src/services/Logger.js");
		const err = new Error("secret");
		new Logger("Ctx").error("prod error", err);
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/\[ERROR\] \[Ctx\] prod error/),
		);
		expect(errorSpy).not.toHaveBeenCalledWith(expect.anything(), err);
	});
});
