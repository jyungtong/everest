import { describe, expect, it } from "vitest";
import { formatResult } from "../src/outputFormatter";

describe("formatResult — without delivery time", () => {
	it("formats a result with discount", () => {
		expect(formatResult({ id: "PKG1", discount: 35, totalCost: 665 })).toBe(
			"PKG1 35 665",
		);
	});

	it("formats a result with zero discount", () => {
		expect(formatResult({ id: "PKG2", discount: 0, totalCost: 275 })).toBe(
			"PKG2 0 275",
		);
	});

	it("formats a result with large values", () => {
		expect(formatResult({ id: "PKG3", discount: 1509, totalCost: 13576 })).toBe(
			"PKG3 1509 13576",
		);
	});
});

describe("formatResult — with delivery time", () => {
	it("appends estimated delivery time when present", () => {
		expect(
			formatResult({
				id: "PKG1",
				discount: 0,
				totalCost: 750,
				estimatedDeliveryTime: 3.98,
			}),
		).toBe("PKG1 0 750 3.98");
	});

	it("appends zero delivery time", () => {
		expect(
			formatResult({
				id: "PKG2",
				discount: 0,
				totalCost: 500,
				estimatedDeliveryTime: 0,
			}),
		).toBe("PKG2 0 500 0");
	});

	it("appends truncated delivery time with two decimal places", () => {
		expect(
			formatResult({
				id: "PKG3",
				discount: 0,
				totalCost: 2350,
				estimatedDeliveryTime: 1.42,
			}),
		).toBe("PKG3 0 2350 1.42");
	});
});
