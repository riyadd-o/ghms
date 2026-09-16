import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'orders'
    ORDER BY ordinal_position;
  `;
  console.log("=== ORDERS COLUMNS ===");
  console.table(cols);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
