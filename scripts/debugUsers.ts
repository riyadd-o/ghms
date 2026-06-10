// Debug script to print users from Neon with correct import path
import sql from "../src/lib/db"; // relative from scripts folder
(async () => {
  try {
    const rows = await sql`SELECT id, email, password_hash, role FROM users ORDER BY email`;
    console.log('Fetched users:', rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    process.exit(1);
  }
})();
