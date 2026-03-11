import type { DeliveryResult } from "./types";

export function formatResult(result: DeliveryResult): string {
	return `${result.id} ${result.discount} ${result.totalCost}`;
}
