import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load local environment
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is not set in .env.local");
  process.exit(1);
}

// Safety check: prevent accidental execution if someone explicitly sets NODE_ENV=production
if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force-dev-reset')) {
  console.error("FATAL: Attempting to run reset script in PRODUCTION environment! Aborted for safety.");
  process.exit(1);
}

const dbUrl = new URL(process.env.DATABASE_URL);
console.log("=== GOLDEN HOTEL: DEVELOPMENT ORDER RESET SCRIPT ===");
console.log(`Connected to Database Host: ${dbUrl.hostname}`);
console.log(`Database Name: ${dbUrl.pathname.replace('/', '')}`);
console.log("Mode: DEVELOPMENT / TESTING RESET\n");

const sql = neon(process.env.DATABASE_URL);

async function resetOrders() {
  console.log("1. Inspecting pre-reset state...");
  const [categoriesBefore] = await sql`SELECT COUNT(*)::int as count FROM categories`;
  const [menuItemsBefore] = await sql`SELECT COUNT(*)::int as count FROM menu_items`;
  const [usersBefore] = await sql`SELECT COUNT(*)::int as count FROM users`;
  const [tokensBefore] = await sql`SELECT COUNT(*)::int as count FROM password_reset_tokens`;

  const [ordersBefore] = await sql`SELECT COUNT(*)::int as count FROM orders`;
  const [orderItemsBefore] = await sql`SELECT COUNT(*)::int as count FROM order_items`;
  const [paymentsBefore] = await sql`SELECT COUNT(*)::int as count FROM payments`;

  console.log(`  - Existing orders: ${ordersBefore.count}`);
  console.log(`  - Existing order_items: ${orderItemsBefore.count}`);
  console.log(`  - Existing payments: ${paymentsBefore.count}`);
  console.log(`  - Categories (preserved): ${categoriesBefore.count}`);
  console.log(`  - Menu items (preserved): ${menuItemsBefore.count}`);
  console.log(`  - Users/Staff (preserved): ${usersBefore.count}`);
  console.log(`  - Password tokens (preserved): ${tokensBefore.count}`);

  console.log("\n2. Executing safe order data removal...");
  
  // Transactional deletion in dependency order
  // 1. Delete payments linked to orders
  const deletedPayments = await sql`DELETE FROM payments RETURNING id`;
  console.log(`  ✓ Deleted ${deletedPayments.length} payment records`);

  // 2. Delete order_items
  const deletedOrderItems = await sql`DELETE FROM order_items RETURNING id`;
  console.log(`  ✓ Deleted ${deletedOrderItems.length} order_item records`);

  // 3. Delete orders
  const deletedOrders = await sql`DELETE FROM orders RETURNING id`;
  console.log(`  ✓ Deleted ${deletedOrders.length} order records`);

  // 4. Reset ID auto-increment sequences so new test orders start from #1
  try {
    await sql`ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;`;
    await sql`ALTER SEQUENCE IF EXISTS order_items_id_seq RESTART WITH 1;`;
    await sql`ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;`;
    console.log("  ✓ Reset primary key sequences for orders, order_items, and payments to 1");
  } catch (seqErr) {
    console.warn("  (Note: Sequence reset skipped or not applicable)", seqErr);
  }

  console.log("\n3. Verifying post-reset state...");
  const [categoriesAfter] = await sql`SELECT COUNT(*)::int as count FROM categories`;
  const [menuItemsAfter] = await sql`SELECT COUNT(*)::int as count FROM menu_items`;
  const [usersAfter] = await sql`SELECT COUNT(*)::int as count FROM users`;
  const [tokensAfter] = await sql`SELECT COUNT(*)::int as count FROM password_reset_tokens`;

  const [ordersAfter] = await sql`SELECT COUNT(*)::int as count FROM orders`;
  const [orderItemsAfter] = await sql`SELECT COUNT(*)::int as count FROM order_items`;
  const [paymentsAfter] = await sql`SELECT COUNT(*)::int as count FROM payments`;

  console.log(`  - Orders count: ${ordersAfter.count} (Expected: 0)`);
  console.log(`  - Order items count: ${orderItemsAfter.count} (Expected: 0)`);
  console.log(`  - Payments count: ${paymentsAfter.count} (Expected: 0)`);
  console.log(`  - Categories count: ${categoriesAfter.count} (Unchanged: ${categoriesBefore.count})`);
  console.log(`  - Menu items count: ${menuItemsAfter.count} (Unchanged: ${menuItemsBefore.count})`);
  console.log(`  - Users count: ${usersAfter.count} (Unchanged: ${usersBefore.count})`);
  console.log(`  - Password tokens count: ${tokensAfter.count} (Unchanged: ${tokensBefore.count})`);

  if (ordersAfter.count === 0 && orderItemsAfter.count === 0 && paymentsAfter.count === 0) {
    console.log("\n🎉 SUCCESS: All existing test orders and payments have been completely reset!");
    console.log("The database is now completely clean and ready for fresh testing.");
  } else {
    console.error("\n❌ WARNING: Some records remain. Please investigate.");
  }
}

resetOrders().catch((err) => {
  console.error("FATAL error during order reset:", err);
  process.exit(1);
});
