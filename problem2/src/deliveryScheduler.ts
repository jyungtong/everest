import type { FleetConfig, Package } from "./types";

function truncate2decimals(value: number): number {
	return Math.floor(value * 100) / 100;
}

// --- Package subset helpers ---

function generateSubsets(packages: Package[]): Package[][] {
	let subsets: Package[][] = [[]];
	for (const pkg of packages) {
		subsets = [...subsets, ...subsets.map((s) => [...s, pkg])];
	}
	return subsets;
}

function totalWeight(packages: Package[]): number {
	return packages.reduce((sum, p) => sum + p.weight, 0);
}

function fitsInVehicle(subset: Package[], maxWeight: number): boolean {
	return totalWeight(subset) <= maxWeight;
}

function heaviestPackageDistance(packages: Package[]): number {
	const maxWeight = Math.max(...packages.map((p) => p.weight));
	return Math.min(
		...packages.filter((p) => p.weight === maxWeight).map((p) => p.distance),
	);
}

// --- isBetter comparison steps ---

function hasMorePackages(candidate: Package[], current: Package[]): boolean {
	return candidate.length > current.length;
}

function hasFewerPackages(candidate: Package[], current: Package[]): boolean {
	return candidate.length < current.length;
}

function hasMoreWeight(candidate: Package[], current: Package[]): boolean {
	return totalWeight(candidate) > totalWeight(current);
}

function hasLessWeight(candidate: Package[], current: Package[]): boolean {
	return totalWeight(candidate) < totalWeight(current);
}

function hasShorterHeaviestDistance(
	candidate: Package[],
	current: Package[],
): boolean {
	return heaviestPackageDistance(candidate) < heaviestPackageDistance(current);
}

/**
 * Returns true if candidate is a better delivery subset than current.
 *
 * Priority:
 * 1. Maximize package count
 * 2. Maximize total weight (on count tie)
 * 3. Minimize distance of the heaviest package in the subset (on weight tie)
 */
function isBetter(candidate: Package[], current: Package[]): boolean {
	if (hasMorePackages(candidate, current)) return true;
	if (hasFewerPackages(candidate, current)) return false;

	if (hasMoreWeight(candidate, current)) return true;
	if (hasLessWeight(candidate, current)) return false;

	return hasShorterHeaviestDistance(candidate, current);
}

/**
 * Selects the best subset of packages that fits within maxWeight.
 */
export function selectBestSubset(
	packages: Package[],
	maxWeight: number,
): Package[] {
	const subsets = generateSubsets(packages);

	let best: Package[] = [];
	for (const subset of subsets) {
		if (subset.length === 0) continue;
		if (fitsInVehicle(subset, maxWeight) && isBetter(subset, best)) {
			best = subset;
		}
	}

	return best;
}

// --- Delivery time helpers ---

function deliveryEta(
	dispatchTime: number,
	distance: number,
	maxSpeed: number,
): number {
	return truncate2decimals(dispatchTime + distance / maxSpeed);
}

function vehicleReturnTime(
	dispatchTime: number,
	maxDist: number,
	maxSpeed: number,
): number {
	return dispatchTime + 2 * truncate2decimals(maxDist / maxSpeed);
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

	while (undelivered.length > 0) {
		const minTime = Math.min(...vehicleAvailability);

		const availableIndices = vehicleAvailability
			.map((t, i) => ({ t, i }))
			.filter(({ t }) => t === minTime);

		for (const { i } of availableIndices) {
			if (undelivered.length === 0) break;

			const subset = selectBestSubset(undelivered, fleet.maxWeight);
			if (subset.length === 0) break;

			const maxDist = Math.max(...subset.map((p) => p.distance));

			for (const pkg of subset) {
				deliveryTimes.set(
					pkg.id,
					deliveryEta(minTime, pkg.distance, fleet.maxSpeed),
				);
				undelivered.splice(undelivered.indexOf(pkg), 1);
			}

			vehicleAvailability[i] = vehicleReturnTime(
				minTime,
				maxDist,
				fleet.maxSpeed,
			);
		}
	}

	return deliveryTimes;
}
