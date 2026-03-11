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

Delivery cost formula: `base_cost + (weight × 10) + (distance × 5)`

### Offer Codes

| Code   | Discount | Weight Range  | Distance Range |
|--------|----------|---------------|----------------|
| OFR001 | 10%      | 70–200 kg     | ≤ 199 km       |
| OFR002 | 7%       | 100–250 kg    | 50–150 km      |
| OFR003 | 5%       | 10–150 kg     | 50–250 km      |

A discount is applied only when **both** weight and distance are within the offer's eligibility range.

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
