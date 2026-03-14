# Everest

A collection of algorithm and coding problem solutions.

## Setup

Install all dependencies from the repo root (covers all problems):

```bash
npm install
```

---

## Problem 1 — Courier Delivery Calculator

A CLI tool that calculates courier parcel delivery costs and applies discount offers.

### How it works

Reads from **stdin**:

```
<base_cost> <num_packages>
<package_id> <weight_kg> <distance_km> [offer_code]
...
```

Outputs one line per package:

```
<package_id> <discount> <total_cost>
```

Delivery cost formula: `base_cost + (weight × weightCostPerKg) + (distance × distanceCostPerKm)`

### Configuration

Cost rates are defined in `problem1/src/config.ts` and must be set before running:

| Field               | Description                         |
|---------------------|-------------------------------------|
| `weightCostPerKg`   | Cost multiplier per kg of weight    |
| `distanceCostPerKm` | Cost multiplier per km of distance  |

Both values must be positive numbers. The app will throw an error at startup if either is invalid.

### Offer Codes

| Code   | Discount | Weight Range  | Distance Range |
|--------|----------|---------------|----------------|
| OFR001 | 10%      | 70–200 kg     | ≤ 199 km       |
| OFR002 | 7%       | 100–250 kg    | 50–150 km      |
| OFR003 | 5%       | 10–150 kg     | 50–250 km      |

A discount is applied only when **both** weight and distance are within the offer's eligibility range.

### Assumptions

- **Offer ranges are inclusive on both ends.** A package with weight=70 qualifies for OFR001 (min=70 is inclusive). The one exception is OFR001's distance, which the spec states as `< 200` (strict), so it is stored as `max: 199`.
- **Discount is rounded to the nearest integer** using `Math.round`. Half-values (e.g. 22.5) round up. The total cost is derived from the rounded discount, not rounded independently.
- **Only the specified offer code is checked.** No best-match or fallback logic is applied — if the code doesn't match a known offer, no discount is given.
- **Input is space-delimited.** Each line is split on whitespace; extra spaces are ignored. The offer code field is optional and defaults to no discount if omitted.
- **`num_packages` in the input is informational.** The app processes all package lines provided; it does not validate that the count matches.
- **Weight and distance must be positive (> 0).** Zero or negative values are rejected at input parsing with an error. Base cost must be non-negative (≥ 0).

### Run

```bash
echo "100 3
PKG1 5 5 OFR001
PKG2 15 5 OFR002
PKG3 10 100 OFR003" | npm run start:problem1
```

Or interactively — type your input and press **Enter on a blank line** or type **`END`** to trigger calculation:

```bash
npm run start:problem1
100 3
PKG1 5 5 OFR001
PKG2 15 5 OFR002
PKG3 10 100 OFR003
END
```

Expected output:

```
PKG1 0 175
PKG2 0 275
PKG3 35 665
```

### Test

```bash
# Problem 1 only
npm run test:problem1

# All problems
npm test
```

---

## Problem 2 — Courier Delivery Calculator with Time Estimation

Extends Problem 1 to also estimate the delivery time for each package by optimally loading a fleet of vehicles.

### How it works

Reads from **stdin**:

```
<base_cost> <num_packages>
<package_id> <weight_kg> <distance_km> [offer_code]
...
<num_vehicles> <max_speed_kmh> <max_carriable_weight_kg>
```

Outputs one line per package (in original input order):

```
<package_id> <discount> <total_cost> <estimated_delivery_time_hours>
```

Cost calculation is identical to Problem 1. The fleet config line is optional — if omitted, the output format matches Problem 1.

### Vehicle Loading Algorithm

At each dispatch, the available vehicle is loaded with the best subset of undelivered packages:

1. **Maximize package count** — fit as many packages as possible within the weight limit
2. **Maximize total weight** — on a count tie, prefer the heavier combination
3. **Minimize distance of heaviest package** — on a count + weight tie, prefer the subset whose heaviest package has the shortest distance (if multiple packages tie for heaviest, the minimum distance among them is used)

When multiple vehicles become available at the same time, all are dispatched simultaneously — each picks from whatever packages remain after the others have loaded.

### Time Calculation

```
Delivery time  = dispatch_time + (package_distance / speed)
Vehicle return = dispatch_time + 2 × (max_distance_in_shipment / speed)
```

Both the per-leg duration and the final delivery time are **truncated** (not rounded) to 2 decimal places. The vehicle's return time uses `2 × truncate(leg)` — the leg is truncated before doubling.

### Assumptions

All assumptions from Problem 1 apply. Additional assumptions:

- **Truncation, not rounding.** `3.456 → 3.45`. Implemented as `Math.floor(value * 100) / 100`.
- **Vehicle return time truncates the leg before doubling.** `return = dispatch + 2 × truncate(maxDist / speed)`. This matches the spec walkthrough (e.g. `2 × 1.42 = 2.84`, not `truncate(2.857) = 2.85`).
- **Subset selection is exhaustive.** Every possible combination of packages is evaluated (the number of combinations doubles with each additional package). Suitable for small inputs; a knapsack DP approach would be needed for scale.
- **Simultaneous vehicle dispatch.** When multiple vehicles share the earliest availability time, all are dispatched in the same scheduling round. Each picks from whatever packages remain after the preceding vehicles (in array-index order) have already loaded their subsets.
- **Output order matches input order**, regardless of delivery sequence.
- **The fleet config line is required for time estimation.** Without it, the program behaves identically to Problem 1.

### Run

```bash
echo "100 5
PKG1 50 30 OFR001
PKG2 75 125 OFR008
PKG3 175 100 OFR003
PKG4 110 60 OFR002
PKG5 155 95 NA
2 70 200" | npm run start:problem2
```

Or interactively — type your input and press **Enter on a blank line** or type **`END`** to trigger calculation:

```bash
npm run start:problem2
100 5
PKG1 50 30 OFR001
PKG2 75 125 OFR008
PKG3 175 100 OFR003
PKG4 110 60 OFR002
PKG5 155 95 NA
2 70 200
END
```

Expected output:

```
PKG1 0 750 3.98
PKG2 0 1475 1.78
PKG3 0 2350 1.42
PKG4 105 1395 0.85
PKG5 0 2125 4.19
```

### Test

```bash
# Problem 2 only
npm run test:problem2

# All problems
npm test
```
