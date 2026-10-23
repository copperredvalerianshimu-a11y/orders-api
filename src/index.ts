import express, { type Request, type Response } from 'express';
import { db } from './db/index.js';
import { customLoggerAndCors } from './middleware/custom.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(customLoggerAndCors);

// GET /health
app.get('/health', (_req: Request, res: Response) => {
  res.send('ok');
});

// GET /orders
app.get('/orders', (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const offset = (page - 1) * limit;

  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId ? parseInt(req.query.customerId as string, 10) : undefined;

  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }
  if (customerId && !isNaN(customerId)) {
    whereClauses.push('customer_id = ?');
    params.push(customerId);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM orders ${whereSql}`);
  const total = (countStmt.get(...params) as { count: number }).count;

  // Top line items for the dashboard header
  let topItems: unknown[] = [];
  topItems =  db.prepare('SELECT * FROM (SELECT * FROM order_items ORDER BY unit_price_cents DESC LIMIT 5) oi JOIN products p ON p.id = oi.product_id').all()
  

  const ordersStmt = db.prepare(`
    SELECT id, customer_id, status, total_cents, created_at
    FROM orders
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `);

  const orders = ordersStmt.all(...params, limit, offset) as Array<{
    id: number;
    customer_id: number;
    status: string;
    total_cents: number;
    created_at: string;
  }>;

  if (orders.length === 0) {
    const totalPages = Math.floor(total / limit);
    res.json({
      data: [],
      page,
      limit,
      total,
      totalPages,
      hasMore: false,
      topItems
    });
    return;
  }

  // Batch load customers and order_items to prevent N+1 queries
  const customerIds = [...new Set(orders.map((o) => o.customer_id))];
  const orderIds = orders.map((o) => o.id);

  const customerPlaceholders = customerIds.map(() => '?').join(',');
  const customersStmt = db.prepare(
    `SELECT id, name, email, country, created_at FROM customers WHERE id IN (${customerPlaceholders})`
  );
  const customersMap = new Map(
    (customersStmt.all(...customerIds) as any[]).map((c) => [c.id, c])
  );

  const orderPlaceholders = orderIds.map(() => '?').join(',');
  const itemsStmt = db.prepare(`
    SELECT oi.id, oi.order_id, oi.product_id, p.name as product_name, p.sku, oi.qty, oi.unit_price_cents
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id IN (${orderPlaceholders})
  `);
  const itemsList = itemsStmt.all(...orderIds) as any[];

  const itemsMap = new Map<number, any[]>();
  for (const item of itemsList) {
    if (!itemsMap.has(item.order_id)) {
      itemsMap.set(item.order_id, []);
    }
    itemsMap.get(item.order_id)!.push(item);
  }

  const enrichedOrders = orders.map((order) => ({
    id: order.id,
    status: order.status,
    total_cents: order.total_cents,
    created_at: order.created_at,
    customer: customersMap.get(order.customer_id) || null,
    items: itemsMap.get(order.id) || []
  }));

  const totalPages = Math.floor(total / limit);

  res.json({
    data: enrichedOrders,
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
    topItems
  });
});

// GET /orders/:id
app.get('/orders/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid order ID' });
    return;
  }

  const orderStmt = db.prepare(`
    SELECT o.id, o.customer_id, o.status, o.total_cents, o.created_at,
           c.name as customer_name, c.email as customer_email, c.country as customer_country
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `);
  const order = orderStmt.get(id) as any;

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const itemsStmt = db.prepare(`
    SELECT oi.id, oi.product_id, p.name as product_name, p.sku, oi.qty, oi.unit_price_cents
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `);
  const items = itemsStmt.all(id);

  res.json({
    id: order.id,
    status: order.status,
    total_cents: order.total_cents,
    created_at: order.created_at,
    customer: {
      id: order.customer_id,
      name: order.customer_name,
      email: order.customer_email,
      country: order.customer_country
    },
    items
  });
});

// GET /customers/:id
app.get('/customers/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid customer ID' });
    return;
  }

  const customer = db.prepare('SELECT id, name, email, country, created_at FROM customers WHERE id = ?').get(id) as any;
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const stats = db.prepare(`
    SELECT COUNT(*) as order_count, COALESCE(SUM(total_cents), 0) as lifetime_spend_cents
    FROM orders
    WHERE customer_id = ?
  `).get(id) as { order_count: number; lifetime_spend_cents: number };

  res.json({
    ...customer,
    order_count: stats.order_count,
    lifetime_spend_cents: stats.lifetime_spend_cents
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});