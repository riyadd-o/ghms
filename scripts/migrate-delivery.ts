import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL not set in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function migrateDelivery() {
  console.log("=== STARTING HOME DELIVERY DATABASE MIGRATION ===");

  // 1. Add order_type and delivery columns to orders table
  await sql`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'HOTEL',
    ADD COLUMN IF NOT EXISTS delivery_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS delivery_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS delivery_address TEXT,
    ADD COLUMN IF NOT EXISTS delivery_area VARCHAR(100),
    ADD COLUMN IF NOT EXISTS delivery_address_details TEXT,
    ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMP WITH TIME ZONE NULL;
  `;
  console.log("✓ Added delivery columns to orders table");

  // 2. Allow delivery_location to be nullable for delivery orders
  await sql`
    ALTER TABLE orders
    ALTER COLUMN delivery_location DROP NOT NULL;
  `;
  console.log("✓ Altered delivery_location to nullable");

  // 3. Create indices for fast filtering
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`;
  console.log("✓ Created indices for order_type and status");

  // 4. Verify columns
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'orders'
    ORDER BY ordinal_position;
  `;
  console.log("\n--- UPDATED ORDERS TABLE SCHEMA ---");
  console.table(cols);

  console.log("🎉 Home Delivery migration completed successfully!");
  process.exit(0);
}

migrateDelivery().catch((err) => {
  console.error("FATAL: Migration failed:", err);
  process.exit(1);
});
