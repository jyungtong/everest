import { describe, expect, it } from "vitest";
import { formatResult } from "../src/outputFormatter";

describe("formatResult", () => {
	it("formats a result with discount", () => {
		expect(formatResult({ id: "PKG1", discount: 35, totalCost: 665 })).toBe("PKG1 35 665");
	});

	it("formats a result with zero discount", () => {
		expect(formatResult({ id: "PKG2", discount: 0, totalCost: 275 })).toBe("PKG2 0 275");
	});

	it("formats a result with large values", () => {
		expect(formatResult({ id: "PKG3", discount: 1509, totalCost: 13576 })).toBe(
			"PKG3 1509 13576",
		);
	});
});
