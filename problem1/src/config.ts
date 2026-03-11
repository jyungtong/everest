import { CostConfig } from "./types";

function assertPositiveNumber(value: number, name: string): void {
  if (!isFinite(value) || value <= 0) {
    throw new Error(`Invalid config: ${name} must be a positive number, got ${value}`);
  }
}

const config: CostConfig = {
  weightCostPerKg: 10,
  distanceCostPerKm: 5,
};

assertPositiveNumber(config.weightCostPerKg, "weightCostPerKg");
assertPositiveNumber(config.distanceCostPerKm, "distanceCostPerKm");

export default config;
