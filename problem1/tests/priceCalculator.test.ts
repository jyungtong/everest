import { describe, it, expect } from "vitest";
import { calculateDeliveryCost } from "../src/priceCalculator";
import { OfferRule, Package } from "../src/types";

const BASE_DELIVERY_COST = 100;
const mockConfig = { weightCostPerKg: 10, distanceCostPerKm: 5 };
const OFFER_CODES: Record<string, OfferRule> = {
  OFR001: { discount: 0.1, distance: { max: 199 }, weight: { min: 70, max: 200 } },
  OFR002: { discount: 0.07, distance: { min: 50, max: 150 }, weight: { min: 100, max: 250 } },
  OFR003: { discount: 0.05, distance: { min: 50, max: 250 }, weight: { min: 10, max: 150 } },
};

describe("calculateDeliveryCost — sample input", () => {
  it("PKG1: weight fails OFR001 criteria → no discount", () => {
    const pkg: Package = { id: "PKG1", weight: 5, distance: 5, offerCode: "OFR001" };
    // Cost = 100 + 5×10 + 5×5 = 175
    // OFR001 requires weight 70–200, weight=5 fails
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "PKG1", discount: 0, totalCost: 175 });
  });

  it("PKG2: distance fails OFR002 criteria → no discount", () => {
    const pkg: Package = { id: "PKG2", weight: 15, distance: 5, offerCode: "OFR002" };
    // Cost = 100 + 15×10 + 5×5 = 275
    // OFR002 requires distance 50–150, distance=5 fails
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "PKG2", discount: 0, totalCost: 275 });
  });

  it("PKG3: both criteria met for OFR003 → 5% discount", () => {
    const pkg: Package = { id: "PKG3", weight: 10, distance: 100, offerCode: "OFR003" };
    // Cost = 100 + 10×10 + 100×5 = 700
    // OFR003: distance 50–250 ✓, weight 10–150 ✓ → 5% of 700 = 35
    // Total = 700 - 35 = 665
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "PKG3", discount: 35, totalCost: 665 });
  });
});

describe("calculateDeliveryCost — OFR001", () => {
  it("applies 10% when both distance <200 and weight 70–200 are met", () => {
    const pkg: Package = { id: "A", weight: 100, distance: 100, offerCode: "OFR001" };
    // Cost = 100 + 1000 + 500 = 1600; 10% = 160; total = 1440
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "A", discount: 160, totalCost: 1440 });
  });

  it("does not apply when distance equals 200 (boundary: strict <200 required)", () => {
    const pkg: Package = { id: "B", weight: 100, distance: 200, offerCode: "OFR001" };
    // distance=200 fails the strict <200 requirement (config stores max: 199)
    const cost = 100 + 1000 + 1000; // 2100
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "B", discount: 0, totalCost: cost });
  });

  it("does not apply when weight is below min (69kg)", () => {
    const pkg: Package = { id: "C", weight: 69, distance: 100, offerCode: "OFR001" };
    const cost = 100 + 690 + 500; // 1290
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "C", discount: 0, totalCost: cost });
  });
});

describe("calculateDeliveryCost — OFR002", () => {
  it("applies 7% when distance 50–150 and weight 100–250", () => {
    const pkg: Package = { id: "D", weight: 150, distance: 100, offerCode: "OFR002" };
    // Cost = 100 + 1500 + 500 = 2100; 7% = 147; total = 1953
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "D", discount: 147, totalCost: 1953 });
  });

  it("does not apply when weight exceeds max (251kg)", () => {
    const pkg: Package = { id: "E", weight: 251, distance: 100, offerCode: "OFR002" };
    const cost = 100 + 2510 + 500; // 3110
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "E", discount: 0, totalCost: cost });
  });
});

describe("calculateDeliveryCost — OFR003", () => {
  it("applies 5% at exact boundary values (distance=50, weight=10)", () => {
    const pkg: Package = { id: "F", weight: 10, distance: 50, offerCode: "OFR003" };
    // Cost = 100 + 100 + 250 = 450; 5% = 22.5 → 23 rounded; total = 450 - 23 = 427
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "F", discount: 23, totalCost: 427 });
  });

  it("does not apply when weight is below min (9kg)", () => {
    const pkg: Package = { id: "G", weight: 9, distance: 100, offerCode: "OFR003" };
    const cost = 100 + 90 + 500; // 690
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "G", discount: 0, totalCost: cost });
  });
});

describe("calculateDeliveryCost — edge cases", () => {
  it("unknown offer code → no discount", () => {
    const pkg: Package = { id: "H", weight: 100, distance: 100, offerCode: "INVALID" };
    const cost = 100 + 1000 + 500; // 1600
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "H", discount: 0, totalCost: cost });
  });

  it("empty offer code → no discount", () => {
    const pkg: Package = { id: "I", weight: 100, distance: 100, offerCode: "" };
    const cost = 100 + 1000 + 500; // 1600
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "I", discount: 0, totalCost: cost });
  });

  it("zero weight and distance → only base cost", () => {
    const pkg: Package = { id: "J", weight: 0, distance: 0, offerCode: "" };
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "J", discount: 0, totalCost: 100 });
  });

  it("different base delivery cost is applied correctly", () => {
    const pkg: Package = { id: "K", weight: 10, distance: 100, offerCode: "OFR003" };
    // Cost = 200 + 100 + 500 = 800; 5% = 40; total = 760
    expect(calculateDeliveryCost(200, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "K", discount: 40, totalCost: 760 });
  });
});

describe("calculateDeliveryCost — rounding behavior", () => {
  it("rounds discount down when fractional part < 0.5", () => {
    const pkg: Package = { id: "R1", weight: 133, distance: 100, offerCode: "OFR002" };
    // Cost = 100 + 1330 + 500 = 1930; 7% = 135.1 → Math.round → 135; total = 1795
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "R1", discount: 135, totalCost: 1795 });
  });

  it("rounds discount up when fractional part >= 0.5", () => {
    const pkg: Package = { id: "R2", weight: 134, distance: 100, offerCode: "OFR002" };
    // Cost = 100 + 1340 + 500 = 1940; 7% = 135.8 → Math.round → 136; total = 1804
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "R2", discount: 136, totalCost: 1804 });
  });

  it("applies exact integer discount with no rounding needed", () => {
    const pkg: Package = { id: "R3", weight: 90, distance: 100, offerCode: "OFR001" };
    // Cost = 100 + 900 + 500 = 1500; 10% = 150.0 (exact); total = 1350
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, OFFER_CODES, mockConfig)).toEqual({ id: "R3", discount: 150, totalCost: 1350 });
  });
});

describe("calculateDeliveryCost — inRange edge cases", () => {
  const CUSTOM_DISCOUNT = 0.1; // 10% for easy math

  it("no lower bound (min: undefined) — weight=0 still qualifies", () => {
    const customOffers: Record<string, OfferRule> = {
      CUSTOM: { weight: { max: 100 }, distance: { min: 0, max: 500 }, discount: CUSTOM_DISCOUNT },
    };
    const pkg: Package = { id: "IR1", weight: 0, distance: 100, offerCode: "CUSTOM" };
    // Cost = 100 + 0 + 500 = 600; 10% = 60; total = 540
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, customOffers, mockConfig)).toEqual({ id: "IR1", discount: 60, totalCost: 540 });
  });

  it("no upper bound (max: undefined) — large distance still qualifies", () => {
    const customOffers: Record<string, OfferRule> = {
      CUSTOM: { weight: { min: 10, max: 200 }, distance: { min: 50 }, discount: CUSTOM_DISCOUNT },
    };
    const pkg: Package = { id: "IR2", weight: 50, distance: 1000, offerCode: "CUSTOM" };
    // Cost = 100 + 500 + 5000 = 5600; 10% = 560; total = 5040
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, customOffers, mockConfig)).toEqual({ id: "IR2", discount: 560, totalCost: 5040 });
  });

  it("both bounds undefined — any value qualifies", () => {
    const customOffers: Record<string, OfferRule> = {
      CUSTOM: { weight: {}, distance: {}, discount: CUSTOM_DISCOUNT },
    };
    const pkg: Package = { id: "IR3", weight: 999, distance: 999, offerCode: "CUSTOM" };
    // Cost = 100 + 9990 + 4995 = 15085; 10% = 1508.5 → 1509; total = 13576
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, customOffers, mockConfig)).toEqual({ id: "IR3", discount: 1509, totalCost: 13576 });
  });

  it("value exactly at max — qualifies (inclusive boundary)", () => {
    const customOffers: Record<string, OfferRule> = {
      CUSTOM: { weight: { min: 10, max: 100 }, distance: { min: 0, max: 200 }, discount: CUSTOM_DISCOUNT },
    };
    const pkg: Package = { id: "IR4", weight: 100, distance: 200, offerCode: "CUSTOM" };
    // Cost = 100 + 1000 + 1000 = 2100; 10% = 210; total = 1890
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, customOffers, mockConfig)).toEqual({ id: "IR4", discount: 210, totalCost: 1890 });
  });

  it("value one above max — does not qualify (inclusive boundary)", () => {
    const customOffers: Record<string, OfferRule> = {
      CUSTOM: { weight: { min: 10, max: 100 }, distance: { min: 0, max: 200 }, discount: CUSTOM_DISCOUNT },
    };
    const pkg: Package = { id: "IR5", weight: 101, distance: 200, offerCode: "CUSTOM" };
    // Cost = 100 + 1010 + 1000 = 2110; weight=101 exceeds max=100 → no discount
    expect(calculateDeliveryCost(BASE_DELIVERY_COST, pkg, customOffers, mockConfig)).toEqual({ id: "IR5", discount: 0, totalCost: 2110 });
  });
});
