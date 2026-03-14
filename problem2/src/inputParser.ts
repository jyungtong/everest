import type { FleetConfig, Package, ParsedInput } from "./types";

function validatePositive(value: number, label: string): void {
	if (value <= 0) {
		throw new Error(`${label} must be positive, got ${value}.`);
	}
}

function parseBaseConfig(line: string): {
	baseCost: number;
	numPackages: number;
} {
	const [rawBaseCost, rawNumPackages] = line.split(/\s+/);

	// baseCost and numPackages are integers by domain definition
	const baseCost = parseInt(rawBaseCost, 10);
	const numPackages = parseInt(rawNumPackages, 10);

	if (Number.isNaN(baseCost) || Number.isNaN(numPackages)) {
		throw new Error(`Invalid header line: "${line}"`);
	}

	if (baseCost < 0) {
		throw new Error(`Base cost must be non-negative, got ${baseCost}.`);
	}
	validatePositive(numPackages, "Package count");

	return { baseCost, numPackages };
}

function parsePackages(
	lines: string[],
	start: number,
	count: number,
): Package[] {
	const packages: Package[] = [];

	for (let i = start; i < start + count; i++) {
		const line = lines[i];
		if (!line) {
			throw new Error(
				`Expected ${count} packages but only found ${i - start}.`,
			);
		}

		const [id, rawWeight, rawDistance, offerCode = ""] = line.split(/\s+/);

		const weight = parseInt(rawWeight, 10);
		const distance = parseInt(rawDistance, 10);

		if (!id || Number.isNaN(weight) || Number.isNaN(distance)) {
			throw new Error(`Invalid package line: "${line}"`);
		}

		if (weight <= 0)
			throw new Error(`Package weight must be positive on line: "${line}"`);
		if (distance <= 0)
			throw new Error(`Package distance must be positive on line: "${line}"`);

		packages.push({ id, weight, distance, offerCode });
	}

	return packages;
}

function parseFleetConfig(line: string): FleetConfig {
	const [rawNumVehicles, rawMaxSpeed, rawMaxWeight] = line.split(/\s+/);

	const numVehicles = parseInt(rawNumVehicles, 10);
	const maxSpeed = parseInt(rawMaxSpeed, 10);
	const maxWeight = parseInt(rawMaxWeight, 10);

	if (
		Number.isNaN(numVehicles) ||
		Number.isNaN(maxSpeed) ||
		Number.isNaN(maxWeight)
	) {
		throw new Error(`Invalid fleet config line: "${line}"`);
	}

	validatePositive(numVehicles, "Number of vehicles");
	validatePositive(maxSpeed, "Max speed");
	validatePositive(maxWeight, "Max carriable weight");

	return { numVehicles, maxSpeed, maxWeight };
}

export function parseInput(lines: string[]): ParsedInput {
	const nonEmptyLines = lines.map((l) => l.trim()).filter((l) => l.length > 0);

	if (nonEmptyLines.length < 1) {
		throw new Error("Input must contain at least a header line.");
	}

	const { baseCost, numPackages } = parseBaseConfig(nonEmptyLines[0]);
	const packages = parsePackages(nonEmptyLines, 1, numPackages);

	const fleetLine = nonEmptyLines[numPackages + 1];
	if (!fleetLine) {
		return { baseCost, packages };
	}

	const fleetConfig = parseFleetConfig(fleetLine);
	return { baseCost, packages, fleetConfig };
}
