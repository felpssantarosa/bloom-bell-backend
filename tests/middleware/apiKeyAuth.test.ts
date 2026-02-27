import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

// We need to mock dotenvConfig before importing the middleware
vi.mock("../../src/services/DotEnvParser.js", () => ({
	dotenvConfig: {
		API_KEY: "test-api-key-1234567890",
	},
}));

// Import after mock
const { apiKeyAuth } = await import("../../src/middleware/apiKeyAuth.js");

describe("apiKeyAuth middleware", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let next: NextFunction;

	beforeEach(() => {
		next = vi.fn();
		res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};
	});

	it("calls next() with valid API key", () => {
		req = { headers: { "x-api-key": "test-api-key-1234567890" } };
		apiKeyAuth(req as Request, res as Response, next);
		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 401 when API key is missing", () => {
		req = { headers: {} };
		apiKeyAuth(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when API key is wrong", () => {
		req = { headers: { "x-api-key": "wrong-key-1234567890000" } };
		apiKeyAuth(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when API key is non-string", () => {
		req = { headers: {} };
		apiKeyAuth(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
	});

	it("returns 401 for empty API key", () => {
		req = { headers: { "x-api-key": "" } };
		apiKeyAuth(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
	});
});
