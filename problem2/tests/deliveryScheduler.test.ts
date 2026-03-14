import { describe, expect, it } from "vitest";
import { scheduleDeliveries, selectBestSubset } from "../src/deliveryScheduler";
import type { FleetConfig, Package } from "../src/types";

const pkg = (id: string, weight: number, distance: number): Package => ({
	id,
	weight,
	distance,
	offerCode: "",
});

describe("selectBestSubset", () => {
	it("returns empty array when no packages fit", () => {
		const packages = [pkg("A", 300, 100)];
		expect(selectBestSubset(packages, 200)).toEqual([]);
	});

	it("picks the single package that fits", () => {
		const packages = [pkg("A", 100, 50)];
		expect(selectBestSubset(packages, 200)).toEqual([pkg("A", 100, 50)]);
	});

	it("maximizes package count over total weight", () => {
		// 2 light packages vs 1 heavy package — prefer 2 packages
		const packages = [pkg("A", 60, 50), pkg("B", 60, 80), pkg("C", 150, 100)];
		const result = selectBestSubset(packages, 200);
		expect(result).toHaveLength(2);
		expect(result.map((p) => p.id).sort()).toEqual(["A", "B"]);
	});

	it("maximizes weight on count tie", () => {
		// 2-package combos: A+B=110, A+C=160, B+C=170 → B+C wins (heaviest)
		const packages = [pkg("A", 50, 100), pkg("B", 60, 100), pkg("C", 110, 100)];
		const result = selectBestSubset(packages, 200);
		expect(result).toHaveLength(2);
		expect(result.map((p) => p.id).sort()).toEqual(["B", "C"]);
	});

	it("minimizes heaviest package distance on count+weight tie", () => {
		// Valid 2-package subsets: A+B=100kg, B+C=100kg (A+C=120>100)
		// A+B: heaviest=A(60, dist=10) → dist=10
		// B+C: heaviest=C(60, dist=30) → dist=30
		// A+B wins (shorter heaviest-package distance)
		const packages = [pkg("A", 60, 10), pkg("B", 40, 50), pkg("C", 60, 30)];
		const result = selectBestSubset(packages, 100);
		expect(result).toHaveLength(2);
		expect(result.map((p) => p.id).sort()).toEqual(["A", "B"]);
	});

	it("does not include packages that would exceed weight limit", () => {
		const packages = [pkg("A", 100, 50), pkg("B", 110, 80)];
		// A+B = 210 > 200; only one fits; A is heavier
		const result = selectBestSubset(packages, 200);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("B");
	});

	it("prefers shorter distance when two packages have equal weight and only one fits", () => {
		// A+B = 200 = limit exactly, but A+B together would be fine;
		// use limit 150 so only one fits: A=100kg dist=30, B=100kg dist=80
		// Same weight → pick A (shorter distance, delivered sooner)
		const packages = [pkg("A", 100, 30), pkg("B", 100, 80)];
		const result = selectBestSubset(packages, 150);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("A");
	});
});

describe("scheduleDeliveries — example from spec", () => {
	const packages: Package[] = [
		pkg("PKG1", 50, 30),
		pkg("PKG2", 75, 125),
		pkg("PKG3", 175, 100),
		pkg("PKG4", 110, 60),
		pkg("PKG5", 155, 95),
	];
	const fleet: FleetConfig = { numVehicles: 2, maxSpeed: 70, maxWeight: 200 };

	it("returns correct delivery times for all packages", () => {
		const times = scheduleDeliveries(packages, fleet);

		// PKG4: 0 + 60/70 = 0.857... → truncated to 0.85
		expect(times.get("PKG4")).toBe(0.85);
		// PKG2: 0 + 125/70 = 1.785... → truncated to 1.78
		expect(times.get("PKG2")).toBe(1.78);
		// PKG3: 0 + 100/70 = 1.428... → truncated to 1.42
		expect(times.get("PKG3")).toBe(1.42);
		// PKG5: 2.84 + 95/70 = 4.197... → truncated to 4.19
		expect(times.get("PKG5")).toBe(4.19);
		// PKG1: 3.56 + 30/70 = 3.988... → truncated to 3.98
		expect(times.get("PKG1")).toBe(3.98);
	});
});

describe("scheduleDeliveries — single vehicle", () => {
	it("delivers packages sequentially when one vehicle", () => {
		// PKG1: 50kg dist 100; PKG2: 150kg dist 50
		const packages = [pkg("PKG1", 50, 100), pkg("PKG2", 150, 50)];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 50, maxWeight: 200 };

		// Trip 1: PKG1+PKG2 fit (200kg). Max dist=100.
		// PKG1 = 0 + 100/50 = 2.00, PKG2 = 0 + 50/50 = 1.00
		// Vehicle returns at: 2*100/50 = 4.00
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("PKG1")).toBe(2.0);
		expect(times.get("PKG2")).toBe(1.0);
	});

	it("delivers in two trips when packages do not all fit", () => {
		// PKG1: 150kg, PKG2: 100kg — can't both fit in 200kg
		const packages = [pkg("PKG1", 150, 100), pkg("PKG2", 100, 50)];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 50, maxWeight: 200 };

		// Trip 1: PKG1 wins (heavier single). Delivered at 0 + 100/50 = 2.00
		// Vehicle returns at 2*100/50 = 4.00
		// Trip 2: PKG2. Delivered at 4 + 50/50 = 5.00
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("PKG1")).toBe(2.0);
		expect(times.get("PKG2")).toBe(5.0);
	});
});

describe("scheduleDeliveries — equal weight tiebreak by distance", () => {
	it("ships shorter-distance package first when equal-weight packages compete for one slot", () => {
		// 3 packages, vehicle capacity 150kg — only one fits per trip
		// PKG1: 100kg dist=30, PKG2: 100kg dist=80, PKG3: 100kg dist=50
		// Trip 1: all tie on weight → pick PKG1 (shortest dist=30). Delivered at 0+30/50=0.60. Returns at 2*30/50=1.20
		// Trip 2: PKG2 vs PKG3 tie on weight → pick PKG3 (shorter dist=50). Delivered at 1.20+50/50=2.20. Returns at 1.20+2*50/50=3.20
		// Trip 3: PKG2. Delivered at 3.20+80/50=4.80
		const packages = [
			pkg("PKG1", 100, 30),
			pkg("PKG2", 100, 80),
			pkg("PKG3", 100, 50),
		];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 50, maxWeight: 150 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("PKG1")).toBe(0.6);
		expect(times.get("PKG2")).toBe(4.8);
		expect(times.get("PKG3")).toBe(2.2);
	});

	it("2 vehicles, 5 packages: equal-weight pair resolved by shorter distance", () => {
		// PKG1 and PKG2 share the same weight (120kg) but differ in distance (30 vs 70).
		// PKG1+PKG3 and PKG2+PKG3 are the only 2-package subsets that hit the 200kg limit.
		// Tiebreak selects PKG1+PKG3 because PKG1's distance (30) < PKG2's distance (70).
		//
		// t=0, Vehicle 0: PKG1(120,30)+PKG3(80,50) → PKG1=0+30/50=0.60, PKG3=0+50/50=1.00; returns 2*1.00=2.00
		// t=0, Vehicle 1: PKG2(120,70)+PKG4(60,40) → PKG4=0+40/50=0.80, PKG2=0+70/50=1.40; returns 2*1.40=2.80
		// t=2.0, Vehicle 0: PKG5(150,80) → 2.00+80/50=3.60
		const packages = [
			pkg("PKG1", 120, 30),
			pkg("PKG2", 120, 70),
			pkg("PKG3", 80, 50),
			pkg("PKG4", 60, 40),
			pkg("PKG5", 150, 80),
			pkg("PKG6", 150, 80),
		];
		const fleet: FleetConfig = { numVehicles: 2, maxSpeed: 50, maxWeight: 200 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("PKG1")).toBe(0.6); // equal-weight, shorter distance → first trip
		expect(times.get("PKG2")).toBe(1.4); // equal-weight, longer distance → second trip
		expect(times.get("PKG3")).toBe(1.0);
		expect(times.get("PKG4")).toBe(0.8);
		expect(times.get("PKG5")).toBe(3.6);
		expect(times.get("PKG6")).toBe(4.4);
	});
});

describe("scheduleDeliveries — truncation", () => {
	it("truncates delivery time to 2 decimal places (does not round up)", () => {
		// dist=100, speed=70 → 100/70 = 1.42857... → truncated: 1.42
		const packages = [pkg("A", 50, 100)];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 70, maxWeight: 200 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("A")).toBe(1.42);
	});
});
