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
- **All numeric inputs (base cost, weight, distance) are assumed to be integers.** Decimal values are accepted by the parser but silently truncated via `parseInt` (e.g. `2.5 kg` is treated as `2 kg`). Explicit decimal support is tracked as a future enhancement.

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

### Future Enhancements

- **Support decimal weights and distances** — `parseInt` silently truncates decimal input (e.g. `2.5 kg` becomes `2`). Switch to `parseFloat` with explicit validation.
- **Runtime-configurable cost rates** — `weightCostPerKg` and `distanceCostPerKm` are hardcoded in `config.ts`. Support environment variables or a config file so rates can change without modifying source.
- **Dynamic offer code management** — Offer codes are compile-time constants. Support loading offers from an external config to enable runtime addition, modification, or removal.
- **Fix OFR001 distance boundary for non-integer distances** — The `max: 199` workaround fails for inputs like `199.5 km`. Use a strict less-than comparator for that boundary instead of storing `199`.
- **Validate `num_packages` against actual input count** — The declared count silently truncates extra package lines. Emit a warning or error on mismatch.
- **Enforce package ID uniqueness** — Duplicate IDs in input produce ambiguous output with no warning.
- **Structured output formats** — Add optional JSON or CSV output modes for programmatic consumption downstream.
- **Streaming input processing** — The entire stdin is buffered before processing begins. Switch to a line-by-line streaming approach for large inputs.
- **End-to-end integration tests** — Only unit tests exist; no test covers the full stdin → stdout pipeline. A regression in `index.ts` orchestration would not be caught.
- **Extract shared code into a common library** — `config.ts`, `priceCalculator.ts`, and parts of `inputParser.ts` are duplicated across problems. Consolidate into a shared package so fixes only need to be applied once.

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

### Future Enhancements

All enhancements listed for Problem 1 apply here as well. Additional enhancements specific to Problem 2:

- **Replace exhaustive subset enumeration with a knapsack DP algorithm** — `generateSubsets` runs in `O(2^n)` time and memory, becoming unusable at ~25 packages. A dynamic programming approach would handle large inputs efficiently.
- **Globally optimal dispatch scheduling** — The greedy local-best subset selection does not minimize total or average delivery time across all packages. A branch-and-bound or DP approach over vehicle states would yield globally optimal results.
- **Fair multi-vehicle dispatch** — When multiple vehicles share the earliest availability time, the first vehicle by array index always gets first pick. Implement a fairness or optimality criterion for simultaneous dispatch instead.
- **Warn when fleet config is absent** — If the fleet config line is missing, time estimation is silently skipped with no user-facing message.
- **Include vehicle traceability in output** — The output shows delivery times but not which vehicle was used, making dispatch decisions unauditable without modifying the source.
- **Output sorted by estimated delivery time** — Results follow input order; add an option to sort by delivery time so the earliest-arriving package appears first.
- **Diagnostic/verbose mode** — No `--verbose` flag exists. Add one to surface internal dispatch decisions (subset chosen, vehicle assigned, offer applied) for debugging and observability.

---

## Architecture & Design Philosophy

### Guiding Principle

This codebase is written with Clean Code principles in mind — specifically the idea that code should read like well-written prose. Functions and modules are named to tell a story: `parseInput`, `calculateDeliveryCost`, `scheduleDeliveries`, `formatResult`. You can read `index.ts` from top to bottom and understand the full program flow without opening another file. Complexity is introduced only when the problem genuinely demands it, not speculatively.

### Pipeline Architecture

Each problem follows a simple, linear pipeline with one module per concern:

```
stdin → inputParser → priceCalculator → [deliveryScheduler] → outputFormatter → stdout
```

`index.ts` is a thin orchestrator — it wires the pipeline together but contains no business logic of its own. Each stage has one job, one name, and one reason to change. Reading the pipeline tells the full story; the individual modules fill in the details.

### Folder Structure

Each problem's `src/` directory is intentionally flat — 6 files, all at the same level, no subfolders. With every file already named after its single job (`inputParser`, `priceCalculator`, `deliveryScheduler`, `outputFormatter`), adding a folder layer like `services/` or `parsers/` would introduce navigation indirection without carrying any information the filenames don't already provide. You'd be opening `services/priceCalculator.ts` instead of `priceCalculator.ts` — the folder name is redundant.

Introducing structure before the complexity justifies it is its own form of over-engineering — folders imposed in anticipation of growth that may never come, at the cost of immediate readability. The pipeline stages are the logical grouping; the filenames already reflect that.

A subfolder earns its place when a module grows to own multiple files. If `deliveryScheduler` expanded into a separate subset selector, a comparator module, and a DP algorithm, a `scheduler/` directory would then carry real meaning. Until that point, the flat layout keeps everything visible at a glance.

### SOLID Principles Applied

- **Single Responsibility (SRP)** — Each module does exactly one thing: `inputParser` parses, `priceCalculator` calculates, `deliveryScheduler` schedules, `outputFormatter` formats. No module owns more than one concern.
- **Open/Closed (OCP)** — Offer codes are data entries in a `Record<string, OfferRule>` config map, not branching logic in the calculator. Adding a new offer requires zero code changes — only a new entry in `OFFER_CODES`. The comment in `config.ts` makes this explicit.
- **Dependency Inversion (DIP)** — `calculateDeliveryCost` and `scheduleDeliveries` receive their configuration (offers, cost rates, fleet config) as explicit parameters rather than importing from module globals. Business logic is decoupled from configuration, which also makes unit tests trivial — each test supplies its own inline config without needing to mock any module.

### Conscious Tradeoffs

`config.ts` and `priceCalculator.ts` are intentionally duplicated between problem1 and problem2 rather than extracted into a shared library. The two problems are deliberately isolated standalone CLIs — coupling them through a shared package would add coordination overhead disproportionate to their scope. The monorepo structure with npm workspaces is already in place to support that extraction cleanly when the tradeoff changes.

### What I'd Change at Scale

The Future Enhancements sections above list the specific inflection points where more abstraction earns its place: replacing the O(2^n) exhaustive subset algorithm with a knapsack DP approach, externalising the hardcoded config, and extracting the shared code into a common library. Each of those is a straightforward next step — held back deliberately because the current scope doesn't justify the added indirection.

---

## AI Tools Disclosure

The following AI-based tools were used during development of this assignment:

| Tool | Nature of Assistance |
|------|----------------------|
| Claude (Anthropic) | Logic guidance, debugging, documentation, and code generation |
