import type { Package } from "./types";

export function parseInput(lines: string[]): {
	baseCost: number;
	packages: Package[];
} {
	const nonEmpty = lines.map((l) => l.trim()).filter((l) => l.length > 0);

	if (nonEmpty.length < 1) {
		throw new Error("Input must contain at least a header line.");
	}

	const [rawBase, rawCount] = nonEmpty[0].split(/\s+/);
	const baseCost = parseInt(rawBase, 10);
	const numPackages = parseInt(rawCount, 10);

	if (Number.isNaN(baseCost) || Number.isNaN(numPackages)) {
		throw new Error(`Invalid header line: "${nonEmpty[0]}"`);
	}

	if (baseCost < 0)
		throw new Error(`Base cost must be non-negative, got ${baseCost}.`);
	if (numPackages <= 0)
		throw new Error(`Package count must be positive, got ${numPackages}.`);

	const packages: Package[] = [];

	for (let i = 1; i <= numPackages; i++) {
		const line = nonEmpty[i];
		if (!line) {
			throw new Error(
				`Expected ${numPackages} packages but only found ${i - 1}.`,
			);
		}

		const parts = line.split(/\s+/);
		const [id, rawWeight, rawDistance, offerCode = ""] = parts;

		const weight = parseFloat(rawWeight);
		const distance = parseFloat(rawDistance);

		if (!id || Number.isNaN(weight) || Number.isNaN(distance)) {
			throw new Error(`Invalid package line: "${line}"`);
		}

		if (weight <= 0)
			throw new Error(`Package weight must be positive on line: "${line}"`);
		if (distance <= 0)
			throw new Error(`Package distance must be positive on line: "${line}"`);

		packages.push({ id, weight, distance, offerCode });
	}

	return { baseCost, packages };
}
