import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function inspect() {
  console.log("=== CURRENT TABLE ROW COUNTS ===");
  const [categoriesCount] = await sql`SELECT COUNT(*)::int as count FROM categories`;
  const [menuItemsCount] = await sql`SELECT COUNT(*)::int as count FROM menu_items`;
  const [usersCount] = await sql`SELECT COUNT(*)::int as count FROM users`;
  const [tokensCount] = await sql`SELECT COUNT(*)::int as count FROM password_reset_tokens`;
  const [ordersCount] = await sql`SELECT COUNT(*)::int as count FROM orders`;
  const [orderItemsCount] = await sql`SELECT COUNT(*)::int as count FROM order_items`;
  const [paymentsCount] = await sql`SELECT COUNT(*)::int as count FROM payments`;

  console.log(`categories: ${categoriesCount.count}`);
  console.log(`menu_items: ${menuItemsCount.count}`);
  console.log(`users: ${usersCount.count}`);
  console.log(`password_reset_tokens: ${tokensCount.count}`);
  console.log(`orders: ${ordersCount.count}`);
  console.log(`order_items: ${orderItemsCount.count}`);
  console.log(`payments: ${paymentsCount.count}`);

  console.log("\n--- ORDERS TABLE CONTENTS ---");
  const orders = await sql`SELECT id, delivery_location, status, total_amount, created_at FROM orders ORDER BY id ASC`;
  console.table(orders);

  console.log("\n--- ORDER_ITEMS TABLE CONTENTS ---");
  const orderItems = await sql`SELECT id, order_id, menu_item_id, name, price, quantity FROM order_items ORDER BY id ASC`;
  console.table(orderItems);

  console.log("\n--- PAYMENTS TABLE CONTENTS ---");
  const payments = await sql`SELECT id, order_id, amount, method, status, provider, provider_payment_id, created_at FROM payments ORDER BY id ASC`;
  console.table(payments);
}

inspect().catch(console.error);
