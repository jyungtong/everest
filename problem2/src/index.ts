import * as readline from "node:readline";
import config, { OFFER_CODES } from "./config";
import { scheduleDeliveries } from "./deliveryScheduler";
import { parseInput } from "./inputParser";
import { formatResult } from "./outputFormatter";
import { calculateDeliveryCost } from "./priceCalculator";

async function main(): Promise<void> {
	const rl = readline.createInterface({ input: process.stdin });
	const lines: string[] = [];

	for await (const line of rl) {
		if (line.trim() === "" || line.trim() === "END") break;
		lines.push(line);
	}
	rl.close();

	const { baseCost, packages, fleetConfig } = parseInput(lines);

	const deliveryTimes = fleetConfig
		? scheduleDeliveries(packages, fleetConfig)
		: new Map<string, number>();

	for (const pkg of packages) {
		const result = calculateDeliveryCost(baseCost, pkg, OFFER_CODES, config);
		result.estimatedDeliveryTime = deliveryTimes.get(pkg.id);
		console.log(formatResult(result));
	}
}

main().catch((err) => {
	console.error(`Error: ${(err as Error).message}`);
	process.exit(1);
});
