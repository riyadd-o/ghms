import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  try {
    await sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''`;
    console.log("Successfully added image_url column");
  } catch (error) {
    console.error("Failed:", error);
  }
}
main();
