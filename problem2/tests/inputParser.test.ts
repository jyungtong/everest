import { describe, expect, it } from "vitest";
import { parseInput } from "../src/inputParser";

describe("parseInput — valid input", () => {
	it("parses a single package with an offer code", () => {
		const lines = ["100 1", "PKG1 5 5 OFR001"];
		expect(parseInput(lines)).toEqual({
			baseCost: 100,
			packages: [{ id: "PKG1", weight: 5, distance: 5, offerCode: "OFR001" }],
		});
	});

	it("parses multiple packages", () => {
		const lines = [
			"100 3",
			"PKG1 5 5 OFR001",
			"PKG2 15 5 OFR002",
			"PKG3 10 100 OFR003",
		];
		expect(parseInput(lines)).toEqual({
			baseCost: 100,
			packages: [
				{ id: "PKG1", weight: 5, distance: 5, offerCode: "OFR001" },
				{ id: "PKG2", weight: 15, distance: 5, offerCode: "OFR002" },
				{ id: "PKG3", weight: 10, distance: 100, offerCode: "OFR003" },
			],
		});
	});

	it("defaults offer code to empty string when omitted", () => {
		const lines = ["100 1", "PKG1 5 5"];
		expect(parseInput(lines)).toEqual({
			baseCost: 100,
			packages: [{ id: "PKG1", weight: 5, distance: 5, offerCode: "" }],
		});
	});

	it("handles decimal weight and distance", () => {
		const lines = ["100 1", "PKG1 2.5 10.7 OFR001"];
		const { packages } = parseInput(lines);
		expect(packages[0].weight).toBe(2.5);
		expect(packages[0].distance).toBe(10.7);
	});

	it("ignores empty lines between entries", () => {
		const lines = ["100 1", "", "PKG1 5 5 OFR001", ""];
		expect(parseInput(lines)).toEqual({
			baseCost: 100,
			packages: [{ id: "PKG1", weight: 5, distance: 5, offerCode: "OFR001" }],
		});
	});

	it("handles extra whitespace between fields", () => {
		const lines = ["100  1", "PKG1  5  5  OFR001"];
		expect(parseInput(lines)).toEqual({
			baseCost: 100,
			packages: [{ id: "PKG1", weight: 5, distance: 5, offerCode: "OFR001" }],
		});
	});

	it("parses zero base cost", () => {
		const lines = ["0 1", "PKG1 5 5"];
		const { baseCost } = parseInput(lines);
		expect(baseCost).toBe(0);
	});
});

describe("parseInput — invalid input", () => {
	it("throws when input is empty", () => {
		expect(() => parseInput([])).toThrow(
			"Input must contain at least a header line.",
		);
	});

	it("throws when input contains only empty lines", () => {
		expect(() => parseInput(["", "  "])).toThrow(
			"Input must contain at least a header line.",
		);
	});

	it("throws when header line has non-numeric base cost", () => {
		expect(() => parseInput(["abc 1", "PKG1 5 5"])).toThrow(
			'Invalid header line: "abc 1"',
		);
	});

	it("throws when header line has non-numeric package count", () => {
		expect(() => parseInput(["100 abc", "PKG1 5 5"])).toThrow(
			'Invalid header line: "100 abc"',
		);
	});

	it("throws when fewer packages provided than declared", () => {
		expect(() => parseInput(["100 3", "PKG1 5 5"])).toThrow(
			"Expected 3 packages but only found 1.",
		);
	});

	it("throws when package line has non-numeric weight", () => {
		expect(() => parseInput(["100 1", "PKG1 abc 5"])).toThrow(
			'Invalid package line: "PKG1 abc 5"',
		);
	});

	it("throws when package line has non-numeric distance", () => {
		expect(() => parseInput(["100 1", "PKG1 5 abc"])).toThrow(
			'Invalid package line: "PKG1 5 abc"',
		);
	});
});

describe("parseInput — invalid values", () => {
	it("throws when base cost is negative", () => {
		expect(() => parseInput(["-1 1", "PKG1 5 5"])).toThrow(
			"Base cost must be non-negative, got -1.",
		);
	});

	it("accepts zero base cost", () => {
		expect(() => parseInput(["0 1", "PKG1 5 5"])).not.toThrow();
	});

	it("throws when package count is zero", () => {
		expect(() => parseInput(["100 0"])).toThrow(
			"Package count must be positive, got 0.",
		);
	});

	it("throws when package count is negative", () => {
		expect(() => parseInput(["100 -1"])).toThrow(
			"Package count must be positive, got -1.",
		);
	});

	it("throws when weight is zero", () => {
		expect(() => parseInput(["100 1", "PKG1 0 5"])).toThrow(
			'Package weight must be positive on line: "PKG1 0 5"',
		);
	});

	it("throws when weight is negative", () => {
		expect(() => parseInput(["100 1", "PKG1 -5 5"])).toThrow(
			'Package weight must be positive on line: "PKG1 -5 5"',
		);
	});

	it("throws when distance is zero", () => {
		expect(() => parseInput(["100 1", "PKG1 5 0"])).toThrow(
			'Package distance must be positive on line: "PKG1 5 0"',
		);
	});

	it("throws when distance is negative", () => {
		expect(() => parseInput(["100 1", "PKG1 5 -10"])).toThrow(
			'Package distance must be positive on line: "PKG1 5 -10"',
		);
	});
});

describe("parseInput — fleet config", () => {
	it("parses fleet config when present", () => {
		const lines = ["100 1", "PKG1 5 5 OFR001", "2 70 200"];
		expect(parseInput(lines)).toEqual({
			baseCost: 100,
			packages: [{ id: "PKG1", weight: 5, distance: 5, offerCode: "OFR001" }],
			fleetConfig: { numVehicles: 2, maxSpeed: 70, maxWeight: 200 },
		});
	});

	it("returns no fleetConfig when fleet line is absent", () => {
		const lines = ["100 1", "PKG1 5 5 OFR001"];
		const result = parseInput(lines);
		expect(result.fleetConfig).toBeUndefined();
	});

	it("throws on invalid fleet config line", () => {
		expect(() => parseInput(["100 1", "PKG1 5 5", "abc 70 200"])).toThrow(
			'Invalid fleet config line: "abc 70 200"',
		);
	});

	it("throws when number of vehicles is zero", () => {
		expect(() => parseInput(["100 1", "PKG1 5 5", "0 70 200"])).toThrow(
			"Number of vehicles must be positive, got 0.",
		);
	});

	it("throws when max speed is zero", () => {
		expect(() => parseInput(["100 1", "PKG1 5 5", "2 0 200"])).toThrow(
			"Max speed must be positive, got 0.",
		);
	});

	it("throws when max weight is zero", () => {
		expect(() => parseInput(["100 1", "PKG1 5 5", "2 70 0"])).toThrow(
			"Max carriable weight must be positive, got 0.",
		);
	});
});
