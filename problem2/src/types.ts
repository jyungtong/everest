export interface Range {
	min?: number;
	max?: number;
}

export interface OfferRule {
	discount: number; // e.g. 0.10 for 10%
	distance: Range;
	weight: Range;
}

export interface Package {
	id: string;
	weight: number; // kg
	distance: number; // km
	offerCode: string;
}

export interface DeliveryResult {
	id: string;
	discount: number;
	totalCost: number;
	estimatedDeliveryTime?: number;
}

export interface CostConfig {
	weightCostPerKg: number;
	distanceCostPerKm: number;
}

export interface FleetConfig {
	numVehicles: number;
	maxSpeed: number; // km/h
	maxWeight: number; // kg
}
