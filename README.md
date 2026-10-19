# orders-api

A high-performance Express and TypeScript service backed by SQLite (`better-sqlite3`), running directly without a compilation step via `tsx`.

## Setup & Usage

### 1. Installation

### 2. Database Seeding
Seeds a deterministic database (`orders.db`) with 5,000 customers, 300 products, 200,000 orders, and ~500,000 order items across 2024 to late 2026.

### 3. Development Mode
Runs the server using `tsx watch` with hot reloads:

### 4. Production Execution
Runs directly via `tsx` without a build step:

### 5. Type Checking

## API Endpoints

| Method | Endpoint | Query Params / Path | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Returns string `"ok"` |
| `GET` | `/orders` | `page`, `limit`, `status`, `customerId` | Paginated envelope of enriched orders with customer and item relations |
| `GET` | `/orders/:id` | `:id` (Order ID) | Single order details + customer profile + array of line items |
| `GET` | `/customers/:id` | `:id` (Customer ID) | Customer profile + `order_count` + `lifetime_spend_cents` |

## Benchmarking & Performance Gates

### Benchmark Script (`bench/bench.sh`)
Executes multiple HTTP GET calls against each endpoint and outputs timing metrics as CSV: