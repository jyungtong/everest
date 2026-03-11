import { CostConfig, DeliveryResult, OfferRule, Package, Range } from "./types";

/**
 * Returns true if `value` is within the inclusive range [min, max].
 * Omitting min means no lower bound; omitting max means no upper bound.
 */
function inRange(value: number, range: Range): boolean {
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

/**
 * Determines whether an offer rule applies to the given package.
 * Both distance AND weight criteria must be satisfied.
 */
function isOfferApplicable(rule: OfferRule, pkg: Package): boolean {
  return inRange(pkg.distance, rule.distance) && inRange(pkg.weight, rule.weight);
}

/**
 * Calculates the delivery cost and applicable discount for a single package.
 *
 * Formula:
 *   deliveryCost = baseCost + (weight × config.weightCostPerKg) + (distance × config.distanceCostPerKm)
 *   discount     = deliveryCost × rule.discount  (if offer applies)
 *   totalCost    = deliveryCost - discount
 *
 * Discount and total cost are rounded to the nearest integer.
 */
export function calculateDeliveryCost(
  baseCost: number,
  pkg: Package,
  offers: Record<string, OfferRule>,
  config: CostConfig
): DeliveryResult {
  const deliveryCost = baseCost + (pkg.weight * config.weightCostPerKg) + (pkg.distance * config.distanceCostPerKm);

  const rule = offers[pkg.offerCode];
  const discountRate = rule && isOfferApplicable(rule, pkg) ? rule.discount : 0;

  const discount = Math.round(deliveryCost * discountRate);
  const totalCost = Math.round(deliveryCost - discount);

  return { id: pkg.id, discount, totalCost };
}
