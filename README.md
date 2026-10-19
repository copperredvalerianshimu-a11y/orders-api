# orders-api

A high-performance Express and TypeScript service backed by SQLite (`better-sqlite3`), running directly without a compilation step via `tsx`.

## Setup & Usage

### 1. Installation

```bash
npm install
```

### 2. Database Seeding
Seeds a deterministic database (`orders.db`) with 5,000 customers, 300 products, 200,000 orders, and ~500,000 order items across 2024 to late 2026.

```bash
npm run seed
```

The generator uses a fixed seed, so every run produces an identical dataset and benchmark timings stay comparable between runs. Re-running drops and recreates the tables, so it is safe to repeat.

### 3. Development Mode
Runs the server using `tsx watch` with hot reloads:

```bash
npm run dev
```

### 4. Production Execution
Runs directly via `tsx` without a build step:

```bash
npm start
```

The server listens on port 3000 by default. Set `PORT` to override it.

### 5. Type Checking

```bash
npm run typecheck
```

## API Endpoints

| Method | Endpoint | Query Params / Path | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Returns string `"ok"` |
| `GET` | `/orders` | `page`, `limit`, `status`, `customerId` | Paginated envelope of enriched orders with customer and item relations |
| `GET` | `/orders/:id` | `:id` (Order ID) | Single order details + customer profile + array of line items |
| `GET` | `/customers/:id` | `:id` (Customer ID) | Customer profile + `order_count` + `lifetime_spend_cents` |

`page` defaults to 1 and `limit` defaults to 20, capped at 100.

```bash
curl 'localhost:3000/orders?page=1&limit=20'
curl 'localhost:3000/orders?status=paid&customerId=15'
curl localhost:3000/orders/500
curl localhost:3000/customers/15
```

## Benchmarking & Performance Gates

Both scripts expect the server to already be running.

### Benchmark Script (`bench/bench.sh`)
Executes multiple HTTP GET calls against each endpoint and outputs timing metrics as CSV:

```bash
./bench/bench.sh 10 baseline
```

The first argument is the number of runs per endpoint (default 10) and the second is a label applied to every row. Output is `label,endpoint,run,seconds`, which pipes straight into a file for comparison:

```bash
./bench/bench.sh 10 before > before.csv
```

### Performance Gate (`bench/perf-check.sh`)
Averages `/orders?page=1&limit=20` over five runs and compares it against a threshold:

```bash
./bench/perf-check.sh
```

Prints the average and exits `0` when it is within budget, or prints `FAIL` and exits `1` when it is not. The threshold defaults to 1200ms and can be overridden for a stricter check:

```bash
PERF_THRESHOLD_MS=200 ./bench/perf-check.sh
```

Because it signals through its exit code, it can be dropped into any CI job as an ordinary step.
