import { db } from './db/index.js';
import { rebuildSchema } from './db/schema.js';

class SeededPRNG {
  private state: number;

  constructor(seed = 1337) {
    this.state = seed;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

function seedDatabase() {
  console.log('Rebuilding database schema...');
  rebuildSchema(db);

  const prng = new SeededPRNG(42);

  const countries = ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU', 'BR'];
  const statuses = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Sam', 'Chris', 'Pat', 'Riley'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const adjectives = ['Pro', 'Ultra', 'Mini', 'Max', 'Eco', 'Super', 'Standard', 'Deluxe'];
  const productTypes = ['Widget', 'Gadget', 'Tool', 'Device', 'Apparatus', 'Instrument'];

  // Start: Jan 1, 2024, End: Oct 31, 2026
  const startDate = new Date('2024-01-01T00:00:00Z').getTime();
  const endDate = new Date('2026-10-31T23:59:59Z').getTime();

  const insertCustomer = db.prepare(
    'INSERT INTO customers (name, email, country, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertProduct = db.prepare(
    'INSERT INTO products (sku, name, price_cents) VALUES (?, ?, ?)'
  );
  const insertOrder = db.prepare(
    'INSERT INTO orders (customer_id, status, total_cents, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertOrderItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents) VALUES (?, ?, ?, ?)'
  );
  const updateOrderTotal = db.prepare(
    'UPDATE orders SET total_cents = ? WHERE id = ?'
  );

  console.log('Seeding 5,000 customers...');
  db.transaction(() => {
    for (let i = 1; i <= 5000; i++) {
      const name = `${prng.choice(firstNames)} ${prng.choice(lastNames)}`;
      const email = `user_${i}_${prng.nextInt(1000, 9999)}@customer.invalid`;
      const country = prng.choice(countries);
      const createdAt = new Date(startDate + prng.next() * (endDate - startDate)).toISOString();
      insertCustomer.run(name, email, country, createdAt);
    }
  })();

  console.log('Seeding 300 products...');
  const productPrices: number[] = [];
  db.transaction(() => {
    for (let i = 1; i <= 300; i++) {
      const sku = `SKU-${10000 + i}`;
      const name = `${prng.choice(adjectives)} ${prng.choice(productTypes)} ${i}`;
      const priceCents = prng.nextInt(499, 49999);
      productPrices.push(priceCents);
      insertProduct.run(sku, name, priceCents);
    }
  })();

  console.log('Seeding 200,000 orders and ~500,000 order items...');
  const CHUNK_SIZE = 10000;
  let totalLineItems = 0;

  for (let batch = 0; batch < 200000 / CHUNK_SIZE; batch++) {
    db.transaction(() => {
      for (let i = 1; i <= CHUNK_SIZE; i++) {
        const orderId = batch * CHUNK_SIZE + i;
        const customerId = prng.nextInt(1, 5000);
        const status = prng.choice(statuses);
        const createdAt = new Date(startDate + prng.next() * (endDate - startDate)).toISOString();

        insertOrder.run(customerId, status, 0, createdAt);

        const itemTypesCount = prng.nextInt(1, 4); // Avg 2.5 items per order = ~500k total
        let totalOrderCents = 0;

        for (let k = 0; k < itemTypesCount; k++) {
          const productId = prng.nextInt(1, 300);
          const qty = prng.nextInt(1, 5);
          const unitPriceCents = productPrices[productId - 1];

          insertOrderItem.run(orderId, productId, qty, unitPriceCents);
          totalOrderCents += qty * unitPriceCents;
          totalLineItems++;
        }

        updateOrderTotal.run(totalOrderCents, orderId);
      }
    })();
    process.stdout.write(`Processed ${ (batch + 1) * CHUNK_SIZE } orders...\r`);
  }

  console.log('\nSeed complete!\n');

  const customerCount = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }).count;
  const productCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
  const orderCount = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }).count;
  const itemCount = (db.prepare('SELECT COUNT(*) as count FROM order_items').get() as { count: number }).count;

  console.table([
    { Table: 'customers', Rows: customerCount },
    { Table: 'products', Rows: productCount },
    { Table: 'orders', Rows: orderCount },
    { Table: 'order_items', Rows: itemCount }
  ]);
}

seedDatabase();