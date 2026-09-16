import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    console.log("Starting payments & orders schema migration...");

    // 1. Extend orders table with timestamps if not present
    await sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE NULL;
    `;
    console.log("✓ Added started_at, ready_at, delivered_at columns to orders");

    // 2. Create payments table
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'ETB',
        method VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        provider VARCHAR(50),
        provider_payment_id VARCHAR(255),
        transaction_id VARCHAR(255),
        checkout_url TEXT,
        paid_at TIMESTAMP WITH TIME ZONE,
        paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        paid_by_email VARCHAR(255),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    console.log("✓ Created payments table");

    // 3. Create indices for fast lookup & reporting
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_provider_tx ON payments(provider_payment_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);`;
    console.log("✓ Created indices on payments table");

    // 4. Backfill payments table for existing orders if any exist without payments
    const existingOrders = await sql`
      SELECT o.id, o.total_amount, o.status, o.created_at
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE p.id IS NULL
    `;

    console.log(`Found ${existingOrders.length} existing orders without payment records.`);
    for (const order of existingOrders) {
      // Historical delivered orders can default to CASH UNPAID or PAID based on their legacy status
      // In Golden Hotel, legacy delivered orders had no payment records. We record them as CASH with UNPAID unless previously delivered.
      // In accordance with rule: DELIVERED does not mean PAID! Keep UNPAID so staff can verify, or preserve accurate status.
      await sql`
        INSERT INTO payments (order_id, amount, currency, method, status, provider, created_at, updated_at)
        VALUES (
          ${order.id}, 
          ${order.total_amount}, 
          'ETB', 
          'CASH', 
          'UNPAID', 
          NULL, 
          ${order.created_at}, 
          ${order.created_at}
        )
      `;
    }
    console.log(`✓ Backfilled ${existingOrders.length} payments records.`);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
