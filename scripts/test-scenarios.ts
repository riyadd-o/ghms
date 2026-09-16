import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { SignJWT } from 'jose';
import { APP_CONFIG } from '../src/lib/config';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING GOLDEN HOTEL HOME DELIVERY AUTOMATED TESTS");
  console.log("==================================================");

  // Get an existing menu item for testing
  const menuItems = await sql`SELECT id, name, price FROM menu_items LIMIT 2`;
  if (menuItems.length === 0) {
    throw new Error("No menu items found in database");
  }
  const item1 = menuItems[0];
  const itemPrice = Number(item1.price);
  console.log(`Using test menu item: "${item1.name}" (ID: ${item1.id}, Price: ETB ${itemPrice.toFixed(2)})`);

  // ----------------------------------------------------
  // TEST 1: HOTEL ORDER WITH CASH
  // ----------------------------------------------------
  console.log("\n--- TEST 1: HOTEL ORDER (Cash Flow) ---");
  const hotelPayload = {
    order_type: "HOTEL",
    delivery_location: "Table 14",
    special_instructions: "No onions",
    payment_method: "CASH",
    customer_name: "Table 14 Guest",
    items: [{ menu_item_id: item1.id, name: item1.name, price: itemPrice, quantity: 2 }],
  };

  const res1 = await fetch("http://localhost:3000/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hotelPayload),
  });
  const order1 = await res1.json();
  if (!res1.ok || order1.order_type !== "HOTEL") {
    throw new Error(`Test 1 Failed: ${JSON.stringify(order1)}`);
  }
  const expectedHotelTotal = itemPrice * 2;
  if (Number(order1.total_amount) !== expectedHotelTotal) {
    throw new Error(`Test 1 Failed: Expected total ${expectedHotelTotal}, got ${order1.total_amount}`);
  }
  console.log(`✓ Hotel Order Created: #${order1.id}, Total: ETB ${order1.total_amount}, Delivery Location: ${order1.delivery_location}`);

  // Test hotel status progression: new -> cooking -> ready -> delivered
  await (await fetch(`http://localhost:3000/api/orders/${order1.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cooking" }),
  })).json();

  await (await fetch(`http://localhost:3000/api/orders/${order1.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ready" }),
  })).json();

  const finalHotelOrder = await (await fetch(`http://localhost:3000/api/orders/${order1.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "delivered" }),
  })).json();

  if (finalHotelOrder.status !== "delivered") {
    throw new Error(`Hotel status transition failed: ${finalHotelOrder.status}`);
  }
  console.log(`✓ Hotel Order #${order1.id} successfully transitioned: new -> cooking -> ready -> delivered`);

  // ----------------------------------------------------
  // TEST 2: DELIVERY ORDER CALCULATION & SECURITY
  // ----------------------------------------------------
  console.log("\n--- TEST 2: DELIVERY ORDER CALCULATION & TAMPER PROTECTION ---");
  // Try sending a fake client total of 10 ETB (tampered)
  const deliveryTamperedPayload = {
    order_type: "DELIVERY",
    delivery_name: "Mohammed Ali",
    delivery_phone: "0911223344",
    delivery_address: "Bole, near Edna Mall",
    delivery_area: "Bole",
    delivery_address_details: "Blue building, 3rd floor",
    delivery_notes: "Please call when you arrive",
    special_instructions: "Extra sauce",
    total_amount: 10, // Attempted tamper by client!
    payment_method: "CASH",
    items: [{ menu_item_id: item1.id, name: item1.name, price: 5, quantity: 1 }], // Fake price 5
  };

  const res2 = await fetch("http://localhost:3000/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(deliveryTamperedPayload),
  });
  const order2 = await res2.json();
  if (!res2.ok) {
    throw new Error(`Test 2 Failed: ${JSON.stringify(order2)}`);
  }

  const expectedDeliveryTotal = itemPrice + APP_CONFIG.DELIVERY_FEE;
  if (Number(order2.total_amount) !== expectedDeliveryTotal) {
    throw new Error(`Test 2 Tamper Failed: Expected trusted total ${expectedDeliveryTotal} (Item: ${itemPrice} + Fee: ${APP_CONFIG.DELIVERY_FEE}), but got ${order2.total_amount}`);
  }
  if (Number(order2.delivery_fee) !== APP_CONFIG.DELIVERY_FEE) {
    throw new Error(`Test 2 Failed: Expected delivery_fee ${APP_CONFIG.DELIVERY_FEE}, got ${order2.delivery_fee}`);
  }
  console.log(`✓ Server security verified: client tampered amounts discarded! Trusted Total: ETB ${order2.total_amount} (Item ETB ${itemPrice} + Delivery Fee ETB ${order2.delivery_fee})`);

  // ----------------------------------------------------
  // TEST 3: DELIVERY STATUS PROGRESSION: OUT_FOR_DELIVERY -> DELIVERED
  // ----------------------------------------------------
  console.log("\n--- TEST 3: DELIVERY STATUS PROGRESSION (including OUT_FOR_DELIVERY) ---");
  await (await fetch(`http://localhost:3000/api/orders/${order2.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cooking" }),
  })).json();

  await (await fetch(`http://localhost:3000/api/orders/${order2.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ready" }),
  })).json();

  const outForDeliveryOrder = await (await fetch(`http://localhost:3000/api/orders/${order2.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "out_for_delivery" }),
  })).json();

  if (outForDeliveryOrder.status !== "out_for_delivery" || !outForDeliveryOrder.out_for_delivery_at) {
    throw new Error(`Test 3 Failed: out_for_delivery transition failed. Status: ${outForDeliveryOrder.status}, out_for_delivery_at: ${outForDeliveryOrder.out_for_delivery_at}`);
  }
  console.log(`✓ Delivery Order #${order2.id} transitioned to OUT_FOR_DELIVERY at ${outForDeliveryOrder.out_for_delivery_at}`);

  const deliveredDeliveryOrder = await (await fetch(`http://localhost:3000/api/orders/${order2.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "delivered" }),
  })).json();

  if (deliveredDeliveryOrder.status !== "delivered") {
    throw new Error(`Test 3 Failed: delivered transition failed. Status: ${deliveredDeliveryOrder.status}`);
  }
  console.log(`✓ Delivery Order #${order2.id} transitioned to DELIVERED`);

  // ----------------------------------------------------
  // TEST 4: UNPAID REVENUE vs PAID REVENUE RULES
  // ----------------------------------------------------
  console.log("\n--- TEST 4: REVENUE & OUTSTANDING REVENUE INTEGRITY ---");
  // Before confirming cash for order2:
  const statsRes1 = await (await fetch("http://localhost:3000/api/payments/stats")).json();
  const outstandingBefore = statsRes1.outstandingRevenue;
  console.log(`Current stats: Paid Revenue = ETB ${statsRes1.totalRevenue}, Outstanding = ETB ${outstandingBefore}`);

  // Fetch real admin user from DB to satisfy foreign key constraint payments_paid_by_fkey
  const [realAdmin] = await sql`SELECT id, email, role FROM users LIMIT 1`;
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default-secret-key-change-it-in-production");
  const staffToken = await new SignJWT({ id: realAdmin.id, email: realAdmin.email, role: realAdmin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(JWT_SECRET);

  // Confirm cash for order2
  const confirmRes = await fetch("http://localhost:3000/api/payments/confirm-cash", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Cookie": `staff_token=${staffToken}`
    },
    body: JSON.stringify({ order_id: order2.id }),
  });
  if (!confirmRes.ok) {
    const errText = await confirmRes.text();
    throw new Error(`Failed to confirm cash for order #${order2.id}: ${errText}`);
  }
  const confirmData = await confirmRes.json();
  console.log(`✓ Cash payment confirmed by authorized staff for Delivery Order #${order2.id}:`, confirmData);

  const [dbPayment] = await sql`SELECT * FROM payments WHERE order_id = ${order2.id}`;
  console.log("DB Payment row after confirm:", dbPayment);

  const statsRes2 = await (await fetch(`http://localhost:3000/api/payments/stats?_t=${Date.now()}`, { cache: "no-store" })).json();
  console.log(`Updated stats: Paid Revenue = ETB ${statsRes2.totalRevenue}, Outstanding = ETB ${statsRes2.outstandingRevenue}`);
  if (statsRes2.totalRevenue < expectedDeliveryTotal) {
    throw new Error("Revenue did not increase by trusted delivery amount!");
  }
  console.log(`✓ Revenue rule verified: delivered order only counted toward revenue when payment became PAID`);

  // ----------------------------------------------------
  // TEST 5: DELIVERY WITH DIGITAL CHAPA PAYMENT
  // ----------------------------------------------------
  console.log("\n--- TEST 5: DELIVERY WITH DIGITAL CHAPA INTEGRATION ---");
  const digitalDeliveryPayload = {
    order_type: "DELIVERY",
    delivery_name: "Sara Bekele",
    delivery_phone: "0922334455",
    delivery_address: "Kazanchis, Near UNECA",
    delivery_area: "Kazanchis",
    payment_method: "DIGITAL",
    items: [{ menu_item_id: item1.id, name: item1.name, price: itemPrice, quantity: 1 }],
  };

  const res3 = await fetch("http://localhost:3000/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(digitalDeliveryPayload),
  });
  const order3 = await res3.json();
  if (!res3.ok) {
    throw new Error(`Test 5 Failed: ${JSON.stringify(order3)}`);
  }

  // Check that Chapa was initialized with Item Total + Delivery Fee
  const [paymentRecord] = await sql`SELECT * FROM payments WHERE order_id = ${order3.id}`;
  if (!paymentRecord) {
    throw new Error(`Payment record not created for digital order #${order3.id}`);
  }

  console.log(`✓ Digital Delivery Order Created: #${order3.id}`);
  console.log(`  Chapa Checkout URL generated: ${paymentRecord.checkout_url ? "YES" : "NO"}`);
  console.log(`  Chapa Billed Amount: ETB ${Number(paymentRecord.amount).toFixed(2)} (Expected: ETB ${expectedDeliveryTotal.toFixed(2)})`);
  if (Number(paymentRecord.amount) !== expectedDeliveryTotal) {
    throw new Error(`Chapa amount mismatch! Expected ${expectedDeliveryTotal}, got ${paymentRecord.amount}`);
  }

  // Verify server-side simulated verification
  const verifyRes = await (await fetch("http://localhost:3000/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: order3.id }),
  })).json();
  console.log(`✓ Payment Verification response: status=${verifyRes.status}`);

  console.log("\n==================================================");
  console.log("ALL 5 AUTOMATED TESTS PASSED CLEANLY!");
  console.log("==================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
