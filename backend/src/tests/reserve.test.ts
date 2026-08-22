/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Test 1 : Cannot reserve more than available inventory.
 * Test 5 : Unauthorized user cannot perform restricted operation.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * These tests run against the live Supabase database that the server is already
 * configured to use (via the .env file).  Make sure the backend server is
 * running (`npm run dev`) before executing the tests.
 */

import "dotenv/config";
import request from "supertest";
import { loginAs, api } from "./helpers";

const BASE_URL = "http://localhost:5001";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch all locations and return the first one that has at least one inventory
 * record with available stock.
 */
async function getLocationWithStock(token: string): Promise<{
  locationId: number;
  productId: number;
  available: number;
}> {
  const inventoryRes = await api(token).get("/api/inventory");
  expect(inventoryRes.status).toBe(200);

  const records: any[] = inventoryRes.body.data ?? [];

  for (const record of records) {
    const available = record.physicalQuantity - record.reservedQuantity;
    if (available > 0) {
      return {
        locationId: record.locationId,
        productId: record.productId,
        available,
      };
    }
  }

  throw new Error(
    "No inventory with available stock found. " +
      "Please add some inventory via POST /api/inventory before running tests."
  );
}

/**
 * Fetch or create a customer to use for order tests.
 */
async function getOrCreateCustomer(token: string): Promise<number> {
  const listRes = await api(token).get("/api/customers");
  if (listRes.status === 200 && listRes.body.data?.length > 0) {
    return listRes.body.data[0].id as number;
  }

  const createRes = await api(token)
    .post("/api/customers")
    .send({
      customerName: "Test Customer",
      mobile: "9999999999",
      businessName: "Test Co",
      customerType: "RETAIL",
      address: "123 Test St",
    });

  expect(createRes.status).toBe(201);
  return createRes.body.data.id as number;
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe("Reservation Tests", () => {
  let salesToken: string;
  let opsToken: string;

  beforeAll(async () => {
    salesToken = await loginAs("SALES");
    opsToken = await loginAs("OPERATIONS");
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 1 — Cannot reserve more stock than is available
  // ────────────────────────────────────────────────────────────────────────────
  it("Test 1 — rejects reservation exceeding available inventory", async () => {
    const { locationId, productId, available } =
      await getLocationWithStock(opsToken);

    const customerId = await getOrCreateCustomer(salesToken);

    // Try to reserve MORE than available
    const excessiveQty = available + 9999;

    const res = await api(salesToken)
      .post("/api/operations/customer-orders")
      .send({
        customerId,
        locationId,
        items: [{ productId, quantity: excessiveQty }],
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/insufficient stock/i);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 5 — Unauthorized user cannot perform restricted operation
  //          Sales user must NOT be able to create a Work Order (Admin only).
  // ────────────────────────────────────────────────────────────────────────────
  it("Test 5 — SALES user cannot create a Work Order (Admin only route)", async () => {
    const inventoryRes = await api(opsToken).get("/api/inventory");
    const records: any[] = inventoryRes.body.data ?? [];
    expect(records.length).toBeGreaterThan(0);

    const { locationId, productId } = records[0];

    const usersRes = await api(opsToken).get("/api/auth/me");
    const userId = usersRes.body.user?.userId ?? 1;

    const res = await api(salesToken)
      .post("/api/operations/work-orders")
      .send({
        productId,
        locationId,
        requiredQuantity: 5,
        assignedUserId: userId,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
