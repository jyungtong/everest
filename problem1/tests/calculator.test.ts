import { describe, it, expect } from "vitest";
import { calculateDelivery } from "../src/calculator";
import { OFFER_CODES } from "../src/offers";
import { Package } from "../src/types";

const BASE = 100;
const mockConfig = { weightCostPerKg: 10, distanceCostPerKm: 5 };

describe("calculateDelivery — sample input", () => {
  it("PKG1: weight fails OFR001 criteria → no discount", () => {
    const pkg: Package = { id: "PKG1", weight: 5, distance: 5, offerCode: "OFR001" };
    // Cost = 100 + 5×10 + 5×5 = 175
    // OFR001 requires weight 70–200, weight=5 fails
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "PKG1", discount: 0, totalCost: 175 });
  });

  it("PKG2: distance fails OFR002 criteria → no discount", () => {
    const pkg: Package = { id: "PKG2", weight: 15, distance: 5, offerCode: "OFR002" };
    // Cost = 100 + 15×10 + 5×5 = 275
    // OFR002 requires distance 50–150, distance=5 fails
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "PKG2", discount: 0, totalCost: 275 });
  });

  it("PKG3: both criteria met for OFR003 → 5% discount", () => {
    const pkg: Package = { id: "PKG3", weight: 10, distance: 100, offerCode: "OFR003" };
    // Cost = 100 + 10×10 + 100×5 = 700
    // OFR003: distance 50–250 ✓, weight 10–150 ✓ → 5% of 700 = 35
    // Total = 700 - 35 = 665
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "PKG3", discount: 35, totalCost: 665 });
  });
});

describe("calculateDelivery — OFR001", () => {
  it("applies 10% when both distance <200 and weight 70–200 are met", () => {
    const pkg: Package = { id: "A", weight: 100, distance: 100, offerCode: "OFR001" };
    // Cost = 100 + 1000 + 500 = 1600; 10% = 160; total = 1440
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "A", discount: 160, totalCost: 1440 });
  });

  it("does not apply when distance equals 200 (boundary: strict <200 required)", () => {
    const pkg: Package = { id: "B", weight: 100, distance: 200, offerCode: "OFR001" };
    // distance=200 fails the strict <200 requirement (config stores max: 199)
    const cost = 100 + 1000 + 1000; // 2100
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "B", discount: 0, totalCost: cost });
  });

  it("does not apply when weight is below min (69kg)", () => {
    const pkg: Package = { id: "C", weight: 69, distance: 100, offerCode: "OFR001" };
    const cost = 100 + 690 + 500; // 1290
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "C", discount: 0, totalCost: cost });
  });
});

describe("calculateDelivery — OFR002", () => {
  it("applies 7% when distance 50–150 and weight 100–250", () => {
    const pkg: Package = { id: "D", weight: 150, distance: 100, offerCode: "OFR002" };
    // Cost = 100 + 1500 + 500 = 2100; 7% = 147; total = 1953
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "D", discount: 147, totalCost: 1953 });
  });

  it("does not apply when weight exceeds max (251kg)", () => {
    const pkg: Package = { id: "E", weight: 251, distance: 100, offerCode: "OFR002" };
    const cost = 100 + 2510 + 500; // 3110
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "E", discount: 0, totalCost: cost });
  });
});

describe("calculateDelivery — OFR003", () => {
  it("applies 5% at exact boundary values (distance=50, weight=10)", () => {
    const pkg: Package = { id: "F", weight: 10, distance: 50, offerCode: "OFR003" };
    // Cost = 100 + 100 + 250 = 450; 5% = 22.5 → 23 rounded; total = 450 - 23 = 427
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "F", discount: 23, totalCost: 427 });
  });

  it("does not apply when weight is below min (9kg)", () => {
    const pkg: Package = { id: "G", weight: 9, distance: 100, offerCode: "OFR003" };
    const cost = 100 + 90 + 500; // 690
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "G", discount: 0, totalCost: cost });
  });
});

describe("calculateDelivery — edge cases", () => {
  it("unknown offer code → no discount", () => {
    const pkg: Package = { id: "H", weight: 100, distance: 100, offerCode: "INVALID" };
    const cost = 100 + 1000 + 500; // 1600
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "H", discount: 0, totalCost: cost });
  });

  it("empty offer code → no discount", () => {
    const pkg: Package = { id: "I", weight: 100, distance: 100, offerCode: "" };
    const cost = 100 + 1000 + 500; // 1600
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "I", discount: 0, totalCost: cost });
  });

  it("zero weight and distance → only base cost", () => {
    const pkg: Package = { id: "J", weight: 0, distance: 0, offerCode: "" };
    expect(calculateDelivery(BASE, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "J", discount: 0, totalCost: 100 });
  });

  it("different base delivery cost is applied correctly", () => {
    const pkg: Package = { id: "K", weight: 10, distance: 100, offerCode: "OFR003" };
    // Cost = 200 + 100 + 500 = 800; 5% = 40; total = 760
    expect(calculateDelivery(200, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "K", discount: 40, totalCost: 760 });
  });
});
