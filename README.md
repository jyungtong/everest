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

## Problem 2

Coming soon.
