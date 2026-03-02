import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { PrivacyController } from "../../src/routes/controllers/PrivacyController.js";
import { TermsController } from "../../src/routes/controllers/TermsController.js";

function makeRes(
	sendFileImpl?: (path: string, cb: (err?: Error) => void) => void,
) {
	const res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		sendFile: vi
			.fn()
			.mockImplementation(
				sendFileImpl ??
					((_path: string, cb: (err?: Error) => void) => cb(undefined)),
			),
	};
	return res;
}

describe("PrivacyController", () => {
	it("sends the privacy html file", () => {
		const res = makeRes();
		const controller = new PrivacyController();
		controller.execute({} as Request, res as unknown as Response);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.sendFile).toHaveBeenCalledWith(
			expect.stringContaining("privacy.html"),
			expect.any(Function),
		);
	});

	it("returns 500 when sendFile fails", () => {
		const res = makeRes((_path, cb) => cb(new Error("not found")));
		const controller = new PrivacyController();
		controller.execute({} as Request, res as unknown as Response);
		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({
			error: "Failed to load Privacy Policy",
		});
	});
});

describe("TermsController", () => {
	it("sends the terms html file", () => {
		const res = makeRes();
		const controller = new TermsController();
		controller.execute({} as Request, res as unknown as Response);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.sendFile).toHaveBeenCalledWith(
			expect.stringContaining("terms.html"),
			expect.any(Function),
		);
	});

	it("returns 500 when sendFile fails", () => {
		const res = makeRes((_path, cb) => cb(new Error("not found")));
		const controller = new TermsController();
		controller.execute({} as Request, res as unknown as Response);
		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({
			error: "Failed to load Terms of Service",
		});
	});
});
