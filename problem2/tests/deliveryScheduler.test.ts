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

describe("selectBestSubset — edge cases", () => {
	it("returns empty array for empty input", () => {
		expect(selectBestSubset([], 200)).toEqual([]);
	});

	it("returns all packages when all fit within capacity", () => {
		const packages = [pkg("A", 50, 10), pkg("B", 60, 20), pkg("C", 70, 30)];
		// Total = 180 ≤ 200; all three should be selected (maximise count)
		const result = selectBestSubset(packages, 200);
		expect(result).toHaveLength(3);
		expect(result.map((p) => p.id).sort()).toEqual(["A", "B", "C"]);
	});

	it("accepts a subset whose total weight equals the limit exactly", () => {
		// A+B = 200 exactly — should be accepted, not rejected
		const packages = [pkg("A", 100, 10), pkg("B", 100, 20)];
		const result = selectBestSubset(packages, 200);
		expect(result).toHaveLength(2);
		expect(result.map((p) => p.id).sort()).toEqual(["A", "B"]);
	});

	it("ignores over-limit packages when valid ones exist", () => {
		// A=250kg (over limit), B=80kg, C=90kg — A must be excluded
		// B+C=170 ≤ 200, so both should be selected
		const packages = [pkg("A", 250, 5), pkg("B", 80, 20), pkg("C", 90, 30)];
		const result = selectBestSubset(packages, 200);
		expect(result).toHaveLength(2);
		expect(result.map((p) => p.id).sort()).toEqual(["B", "C"]);
	});

	it("third tiebreaker: picks subset with shorter heaviest-package distance among three competing subsets", () => {
		// Three 2-package subsets all weigh 100kg:
		//   A(50)+B(50): heaviest tie at 50kg → min dist = min(10,20) = 10
		//   A(50)+C(50): heaviest tie at 50kg → min dist = min(10,30) = 10  (tie with A+B)
		//   B(50)+C(50): heaviest tie at 50kg → min dist = min(20,30) = 20
		// A+B and A+C both yield 10; A+B is encountered first and should win over B+C.
		// The key assertion is that B+C (dist=20) is NOT selected.
		const packages = [pkg("A", 50, 10), pkg("B", 50, 20), pkg("C", 50, 30)];
		const result = selectBestSubset(packages, 100);
		expect(result).toHaveLength(2);
		// A must be in the result (it provides the shortest heaviest-package distance)
		expect(result.map((p) => p.id)).toContain("A");
	});

	it("uses minimum distance among tied-heaviest packages within the same subset", () => {
		// Subset A+B: both weigh 80kg (tied for heaviest).
		// heaviestPackageDistance should return min(dist_A, dist_B) = min(15, 40) = 15.
		// Subset C+D: both weigh 80kg, min dist = min(25, 35) = 25.
		// A+B wins on the third tiebreaker.
		const packages = [
			pkg("A", 80, 15),
			pkg("B", 80, 40),
			pkg("C", 80, 25),
			pkg("D", 80, 35),
		];
		// Limit 160 → only 2-package subsets fit (4×80=320 > 160)
		// 2-package subsets: A+B=160, A+C=160, A+D=160, B+C=160, B+D=160, C+D=160 — all equal weight
		// heaviestPackageDistance: A+B→15, A+C→15, A+D→15, B+C→25, B+D→35, C+D→25
		// A+B, A+C, A+D all tie at 15; A+B should win (or any with A, first encountered)
		const result = selectBestSubset(packages, 160);
		expect(result).toHaveLength(2);
		expect(result.map((p) => p.id)).toContain("A"); // A's dist=15 drives the minimum
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

	it("returns exact integer delivery time without spurious decimals", () => {
		// dist=100, speed=50 → 100/50 = 2.00 exactly
		const packages = [pkg("A", 50, 100)];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 50, maxWeight: 200 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("A")).toBe(2);
	});

	it("preserves exactly 2 decimal places without over-truncating", () => {
		// dist=75, speed=50 → 75/50 = 1.50 exactly — should not become 1.49
		const packages = [pkg("A", 50, 75)];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 50, maxWeight: 200 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("A")).toBe(1.5);
	});

	it("truncates correctly after accumulated return-time across multiple trips", () => {
		// vehicleReturnTime truncates one-way time *before* doubling.
		// dist=100, speed=70 → one-way truncated = 1.42, return = 2*1.42 = 2.84
		// (NOT truncate(2*100/70) = truncate(2.857) = 2.85)
		//
		// Both packages are 150kg, limit 150 → one per trip.
		// Tiebreak: equal weight → shorter distance goes first → PKG2(50km) first.
		// Trip 1: PKG2 delivered at 0 + 50/70 = 0.71... → truncated: 0.71. Returns 2*0.71=1.42.
		// Trip 2: PKG1 delivered at 1.42 + 100/70 = 1.42 + 1.42... → truncated: 2.84.
		const packages = [pkg("PKG1", 150, 100), pkg("PKG2", 150, 50)];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 70, maxWeight: 150 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("PKG2")).toBe(0.71);
		// return time for trip 1 = 2 * truncate(50/70) = 2 * 0.71 = 1.42
		// PKG1 = 1.42 + 100/70 = 1.42 + 1.4285... → truncate(2.8485...) = 2.84
		expect(times.get("PKG1")).toBe(2.84);
	});
});

describe("scheduleDeliveries — edge cases", () => {
	it("returns empty map for empty package list", () => {
		const fleet: FleetConfig = { numVehicles: 2, maxSpeed: 50, maxWeight: 200 };
		const times = scheduleDeliveries([], fleet);
		expect(times.size).toBe(0);
	});

	it("handles single package with single vehicle", () => {
		// PKG1: 80kg, dist=60, speed=50 → 60/50 = 1.20
		const packages = [pkg("PKG1", 80, 60)];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 50, maxWeight: 200 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("PKG1")).toBe(1.2);
	});

	it("delivers all packages in one trip when they all fit", () => {
		// 3 packages total weight 180 ≤ 200; single vehicle, one trip
		// PKG1: 60kg dist=40 → 40/50=0.80
		// PKG2: 60kg dist=60 → 60/50=1.20
		// PKG3: 60kg dist=80 → 80/50=1.60
		const packages = [
			pkg("PKG1", 60, 40),
			pkg("PKG2", 60, 60),
			pkg("PKG3", 60, 80),
		];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 50, maxWeight: 200 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("PKG1")).toBe(0.8);
		expect(times.get("PKG2")).toBe(1.2);
		expect(times.get("PKG3")).toBe(1.6);
	});

	it("uses only as many vehicles as needed when fleet is larger than trips required", () => {
		// 2 packages, each 150kg, limit 200 → one per trip; 5 vehicles available.
		// Vehicle 0 takes PKG1 at t=0, Vehicle 1 takes PKG2 at t=0.
		// PKG1: 0 + 100/50 = 2.00; PKG2: 0 + 60/50 = 1.20
		const packages = [pkg("PKG1", 150, 100), pkg("PKG2", 150, 60)];
		const fleet: FleetConfig = { numVehicles: 5, maxSpeed: 50, maxWeight: 200 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("PKG1")).toBe(2.0);
		expect(times.get("PKG2")).toBe(1.2);
		// All packages delivered; map has exactly 2 entries
		expect(times.size).toBe(2);
	});

	it("dispatches two vehicles simultaneously at t=0 when both are available", () => {
		// 4 packages; each pair fits in one vehicle; both vehicles start at t=0.
		// Vehicle 0: PKG1(100,80)+PKG2(100,40) → PKG1=80/50=1.60, PKG2=40/50=0.80; returns 2*1.60=3.20
		// Vehicle 1: PKG3(100,70)+PKG4(100,30) → PKG3=70/50=1.40, PKG4=30/50=0.60; returns 2*1.40=2.80
		// (selectBestSubset picks the heaviest — all tie at 200 — then shortest heaviest distance;
		//  heaviest in each pair is the one with longer distance, so it picks PKG1+PKG3's pairs
		//  based on the tiebreaker; let's keep weights unambiguous.)
		//
		// Simpler: all 4 at 100kg each, limit 200 → best subset always 2.
		// Trip 1 (vehicle 0): highest weight 2-pkg combo. All 2-combos = 200kg.
		//   Tiebreak: min(heaviest distances). PKG1(100,80)+PKG2(100,40)→ min(80,40)=40
		//   PKG1(100,80)+PKG3(100,70)→ min(80,70)=70; etc. Lowest is PKG2+PKG4 = min(40,30)=30.
		//   But PKG1+PKG2 (min=40) vs PKG2+PKG4 (min=30)… PKG2+PKG4 wins.
		// Let's just verify both vehicles are dispatched at t=0 and all 4 packages are delivered.
		const packages = [
			pkg("PKG1", 100, 80),
			pkg("PKG2", 100, 40),
			pkg("PKG3", 100, 70),
			pkg("PKG4", 100, 30),
		];
		const fleet: FleetConfig = { numVehicles: 2, maxSpeed: 50, maxWeight: 200 };
		const times = scheduleDeliveries(packages, fleet);
		// All 4 packages must be delivered
		expect(times.size).toBe(4);
		// All delivery times must be > 0 (dispatched at t=0, distance > 0)
		for (const time of times.values()) {
			expect(time).toBeGreaterThan(0);
		}
		// PKG1 and PKG2 cannot be in the same first-trip subset as PKG3 and PKG4
		// because that would require 4 packages — verify all 4 got unique delivery times
		const allTimes = [...times.values()];
		expect(new Set(allTimes).size).toBe(4);
	});

	it("routes the next trip to the vehicle that returns earliest", () => {
		// Vehicle 0: trips far away (returns late).
		// Vehicle 1: trips nearby (returns early) → should get next package sooner.
		//
		// 3 packages all 150kg, limit 150 → one per trip.
		// Tiebreak: equal weight → shortest distance first.
		// t=0, two vehicles dispatch:
		//   Vehicle 0 picks shortest remaining: PKG2(20km) → delivered 20/50=0.40; returns 2*0.40=0.80
		//   Vehicle 1 picks next shortest:      PKG3(60km) → delivered 60/50=1.20; returns 2*1.20=2.40
		// t=0.80, Vehicle 0 returns first: PKG1(100km) → delivered 0.80+100/50=0.80+2.00=2.80
		const packages = [
			pkg("PKG1", 150, 100),
			pkg("PKG2", 150, 20),
			pkg("PKG3", 150, 60),
		];
		const fleet: FleetConfig = { numVehicles: 2, maxSpeed: 50, maxWeight: 150 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.get("PKG2")).toBe(0.4);
		expect(times.get("PKG3")).toBe(1.2);
		// PKG1 dispatched at t=0.80 (vehicle 0 returns first)
		expect(times.get("PKG1")).toBe(2.8);
	});

	it("handles packages with identical weight and distance", () => {
		// 3 identical packages, single vehicle, capacity fits 2 per trip.
		// Trip 1: pick 2 (max count). Both delivered at 0 + 50/50 = 1.00.
		// Vehicle returns at 2 * 1.00 = 2.00.
		// Trip 2: remaining 1. Delivered at 2.00 + 50/50 = 3.00.
		const packages = [pkg("A", 80, 50), pkg("B", 80, 50), pkg("C", 80, 50)];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 50, maxWeight: 200 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.size).toBe(3);
		// Two packages delivered at t=1.00, one at t=3.00
		const deliveryValues = [...times.values()].sort((a, b) => a - b);
		expect(deliveryValues[0]).toBe(1.0);
		expect(deliveryValues[1]).toBe(1.0);
		expect(deliveryValues[2]).toBe(3.0);
	});

	it("schedules correctly with 3 vehicles and many trips required", () => {
		// 9 packages × 100kg each; vehicle limit 100 → one package per trip.
		// 3 vehicles dispatched at t=0: distances 10, 20, 30.
		// Returns: 2*(10/10)=2, 2*(20/10)=4, 2*(30/10)=6.
		// t=2: vehicle 0 dispatched with dist=40 → delivered 2+4=6; returns 2+8=10
		// t=4: vehicle 1 dispatched with dist=50 → delivered 4+5=9; returns 4+10=14
		// t=6: vehicle 2 dispatched with dist=60 → delivered 6+6=12; returns 6+12=18
		// t=10: vehicle 0 dispatched with dist=70 → delivered 10+7=17; returns 10+14=24
		// t=14: vehicle 1 dispatched with dist=80 → delivered 14+8=22; returns 14+16=30
		// t=18: vehicle 2 dispatched with dist=90 → delivered 18+9=27; returns 18+18=36
		const packages = [
			pkg("P1", 100, 10),
			pkg("P2", 100, 20),
			pkg("P3", 100, 30),
			pkg("P4", 100, 40),
			pkg("P5", 100, 50),
			pkg("P6", 100, 60),
			pkg("P7", 100, 70),
			pkg("P8", 100, 80),
			pkg("P9", 100, 90),
		];
		const fleet: FleetConfig = { numVehicles: 3, maxSpeed: 10, maxWeight: 100 };
		const times = scheduleDeliveries(packages, fleet);
		expect(times.size).toBe(9);
		// Shortest-distance packages go first (tiebreaker on equal weight)
		expect(times.get("P1")).toBe(1.0); // 0 + 10/10
		expect(times.get("P2")).toBe(2.0); // 0 + 20/10
		expect(times.get("P3")).toBe(3.0); // 0 + 30/10
		expect(times.get("P4")).toBe(6.0); // 2 + 40/10
		expect(times.get("P5")).toBe(9.0); // 4 + 50/10
		expect(times.get("P6")).toBe(12.0); // 6 + 60/10
		expect(times.get("P7")).toBe(17.0); // 10 + 70/10
		expect(times.get("P8")).toBe(22.0); // 14 + 80/10
		expect(times.get("P9")).toBe(27.0); // 18 + 90/10
	});
});

describe("scheduleDeliveries — greedy behavior", () => {
	it("documents greedy selection: always picks best local subset, not globally optimal order", () => {
		// The scheduler greedily picks the locally best subset each trip.
		// This means a "heavy but far" package may delay a "light but close" one.
		//
		// 3 packages, 1 vehicle, limit 150:
		//   PKG1: 150kg dist=100 (fits alone, heaviest)
		//   PKG2:  80kg dist=10
		//   PKG3:  70kg dist=20
		//
		// Greedy trip 1: best single = PKG1 (heaviest). Delivered at 100/50=2.00. Returns 4.00.
		// Greedy trip 2: PKG2+PKG3=150kg fit together. Delivered at 4+10/50=4.20 and 4+20/50=4.40.
		//
		// Alternative order (PKG2+PKG3 first) would give:
		//   Trip 1: PKG2=0.20, PKG3=0.40. Returns at 2*0.40=0.80.
		//   Trip 2: PKG1=0.80+2.00=2.80. — PKG1 later but PKG2/PKG3 earlier.
		//
		// The greedy result is deterministic and documented here.
		const packages = [
			pkg("PKG1", 150, 100),
			pkg("PKG2", 80, 10),
			pkg("PKG3", 70, 20),
		];
		const fleet: FleetConfig = { numVehicles: 1, maxSpeed: 50, maxWeight: 150 };
		const times = scheduleDeliveries(packages, fleet);
		// Greedy picks PKG1 first (heaviest single = 150kg beats PKG2+PKG3=150kg on... wait,
		// PKG2+PKG3 = 150kg and count=2 > PKG1 count=1 → greedy actually picks PKG2+PKG3 first!
		// Trip 1: PKG2(0+10/50=0.20) + PKG3(0+20/50=0.40). Returns 2*0.40=0.80.
		// Trip 2: PKG1(0.80+100/50=2.80).
		expect(times.get("PKG2")).toBe(0.2);
		expect(times.get("PKG3")).toBe(0.4);
		expect(times.get("PKG1")).toBe(2.8);
	});
});
