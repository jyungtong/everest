import type { DeliveryResult } from "./types";

export function formatResult(result: DeliveryResult): string {
	if (result.estimatedDeliveryTime !== undefined) {
		return `${result.id} ${result.discount} ${result.totalCost} ${result.estimatedDeliveryTime}`;
	}
	return `${result.id} ${result.discount} ${result.totalCost}`;
}
