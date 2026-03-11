import * as readline from "node:readline";
import config, { OFFER_CODES } from "./config";
import { calculateDeliveryCost } from "./priceCalculator";
import type { Package } from "./types";

function parseInput(lines: string[]): {
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

		packages.push({ id, weight, distance, offerCode });
	}

	return { baseCost, packages };
}

async function main(): Promise<void> {
	const rl = readline.createInterface({ input: process.stdin });
	const lines: string[] = [];

	for await (const line of rl) {
		if (line.trim() === "" || line.trim() === "END") break;
		lines.push(line);
	}
	rl.close();

	const { baseCost, packages } = parseInput(lines);

	for (const pkg of packages) {
		const result = calculateDeliveryCost(baseCost, pkg, OFFER_CODES, config);
		console.log(`${result.id} ${result.discount} ${result.totalCost}`);
	}
}

main().catch((err) => {
	console.error(`Error: ${(err as Error).message}`);
	process.exit(1);
});
