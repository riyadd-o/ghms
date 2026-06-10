// Script to ensure staff users have bcrypt‑hashed passwords
import bcrypt from "bcryptjs";
import sql from "../src/lib/db.ts"; // explicit extension for ts-node

// Define the users and their plain‑text passwords
const users = [
  { email: "chef@goldenhotel.com", plainPwd: "kitchen123", role: "chef" },
  { email: "admin@goldenhotel.com", plainPwd: "admin123", role: "admin" },
];

(async () => {
  try {
    for (const { email, plainPwd, role } of users) {
      const hash = await bcrypt.hash(plainPwd, 10);
      // Upsert the user – if it exists, update the hash and role; otherwise insert
      await sql`
        INSERT INTO users (email, password_hash, role)
        VALUES (${email}, ${hash}, ${role})
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
      `;
      console.log(`✅ Updated ${email} (role: ${role})`);
    }
    console.log("All users processed.");
  } catch (err) {
    console.error("Error updating users:", err);
    process.exit(1);
  }
})();
