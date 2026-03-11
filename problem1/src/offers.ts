import { OfferRule } from "./types";

/**
 * Offer code configuration.
 * Each entry maps a code to its discount rate and eligibility criteria.
 * To add a new offer, simply add a new entry here — no other code changes needed.
 *
 * Range fields are inclusive on both ends. Omitting min/max means no lower/upper bound.
 */
export const OFFER_CODES: Record<string, OfferRule> = {
  OFR001: {
    discount: 0.1,
    distance: { max: 199 }, // spec says distance < 200 (strict less-than)
    weight: { min: 70, max: 200 },
  },
  OFR002: {
    discount: 0.07,
    distance: { min: 50, max: 150 },
    weight: { min: 100, max: 250 },
  },
  OFR003: {
    discount: 0.05,
    distance: { min: 50, max: 250 },
    weight: { min: 10, max: 150 },
  },
};
