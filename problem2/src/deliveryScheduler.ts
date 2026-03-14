import type { FleetConfig, Package } from "./types";

function truncate2decimals(value: number): number {
	return Math.floor(value * 100) / 100;
}

/**
 * Selects the best subset of packages that fits within maxWeight.
 *
 * Priority:
 * 1. Maximize package count
 * 2. Maximize total weight (on count tie)
 * 3. Minimize distance of the heaviest package in the subset (on weight tie)
 */
export function selectBestSubset(
	packages: Package[],
	maxWeight: number,
): Package[] {
	let subsets: Package[][] = [[]];
	for (const pkg of packages) {
		subsets = [...subsets, ...subsets.map((s) => [...s, pkg])];
	}

	let best: Package[] = [];
	for (const subset of subsets) {
		if (subset.length === 0) continue;
		const weight = subset.reduce((sum, p) => sum + p.weight, 0);
		const fits = weight <= maxWeight;
		const better = fits && isBetter(subset, best);
		if (better) {
			best = subset;
		}
	}

	return best;
}

function isBetter(candidate: Package[], current: Package[]): boolean {
	if (candidate.length > current.length) return true;
	if (candidate.length < current.length) return false;

	const candWeight = candidate.reduce((s, p) => s + p.weight, 0);
	const currWeight = current.reduce((s, p) => s + p.weight, 0);

	if (candWeight > currWeight) return true;
	if (candWeight < currWeight) return false;

	// Tie on count and weight: prefer subset whose heaviest package has shortest distance
	const candMaxWeight = Math.max(...candidate.map((p) => p.weight));
	const currMaxWeight = Math.max(...current.map((p) => p.weight));

	const candHeaviestDist = Math.min(
		...candidate
			.filter((p) => p.weight === candMaxWeight)
			.map((p) => p.distance),
	);
	const currHeaviestDist = Math.min(
		...current.filter((p) => p.weight === currMaxWeight).map((p) => p.distance),
	);

	return candHeaviestDist < currHeaviestDist;
}

/**
 * Schedules deliveries for all packages given a fleet config.
 * Returns a map of package id → estimated delivery time (truncated to 2 decimal places).
 */
export function scheduleDeliveries(
	packages: Package[],
	fleet: FleetConfig,
): Map<string, number> {
	const deliveryTimes = new Map<string, number>();
	const undelivered = [...packages];
	const vehicleAvailability = Array<number>(fleet.numVehicles).fill(0);

	let round = 0;
	while (undelivered.length > 0) {
		round++;
		const minTime = Math.min(...vehicleAvailability);

		// Dispatch all vehicles available at minTime
		const availableIndices = vehicleAvailability
			.map((t, i) => ({ t, i }))
			.filter(({ t }) => t === minTime);

		for (const { i } of availableIndices) {
			if (undelivered.length === 0) break;

			const subset = selectBestSubset(undelivered, fleet.maxWeight);
			if (subset.length === 0) break;

			const dispatchTime = minTime;
			const maxDist = Math.max(...subset.map((p) => p.distance));

			for (const pkg of subset) {
				const eta = truncate2decimals(dispatchTime + pkg.distance / fleet.maxSpeed);
				deliveryTimes.set(pkg.id, eta);
				undelivered.splice(undelivered.indexOf(pkg), 1);
			}

			// Vehicle return time uses truncate2decimals on the leg before doubling (matches spec walkthrough)
			const returnTime = dispatchTime + 2 * truncate2decimals(maxDist / fleet.maxSpeed);
			vehicleAvailability[i] = returnTime;
		}
	}

	return deliveryTimes;
}
