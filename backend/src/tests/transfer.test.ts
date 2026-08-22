/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Test 2 : Cannot transfer more than available inventory.
 * Test 3 : Destination stock increases ONLY after transfer RECEIVED
 *          (not after DISPATCHED).
 * Test 4 : Same transfer cannot be received twice.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Runs against the live Supabase-backed server.
 * Make sure `npm run dev` is running before executing.
 */

import "dotenv/config";
import { loginAs, api } from "./helpers";

// ── helpers ───────────────────────────────────────────────────────────────────

async function getInventorySnapshot(
  token: string,
  productId: number,
  locationId: number
): Promise<number> {
  const res = await api(token).get(
    `/api/inventory?productId=${productId}&locationId=${locationId}`
  );
  const records: any[] = res.body.data ?? [];
  return records.reduce(
    (sum: number, r: any) => sum + r.physicalQuantity,
    0
  );
}

/**
 * Find or create two distinct locations.
 * Returns { srcId, dstId }.
 */
async function getTwoLocations(
  token: string
): Promise<{ srcId: number; dstId: number }> {
  const res = await api(token).get("/api/locations");
  const locs: any[] = res.body.data ?? [];

  if (locs.length >= 2) {
    return { srcId: locs[0].id, dstId: locs[1].id };
  }

  // Create a second location if only one exists
  const createRes = await api(token)
    .post("/api/locations")
    .send({ name: "Test Destination", code: `DEST-${Date.now()}` });

  expect(createRes.status).toBe(201);

  return { srcId: locs[0].id, dstId: createRes.body.data.id };
}

/**
 * Find an inventory record at srcId with available stock ≥ 1.
 */
async function getSourceInventory(
  token: string,
  srcId: number
): Promise<{ productId: number; available: number }> {
  const res = await api(token).get(`/api/inventory?locationId=${srcId}`);
  const records: any[] = res.body.data ?? [];

  for (const r of records) {
    const avail = r.physicalQuantity - r.reservedQuantity;
    if (avail >= 1) {
      return { productId: r.productId, available: avail };
    }
  }

  throw new Error(
    `No inventory with available stock at locationId=${srcId}. ` +
      "Please seed inventory before running transfer tests."
  );
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe("Transfer Tests", () => {
  let opsToken: string;

  beforeAll(async () => {
    opsToken = await loginAs("OPERATIONS");
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 2 — Cannot transfer more than available inventory
  // ────────────────────────────────────────────────────────────────────────────
  it("Test 2 — rejects transfer exceeding available inventory at source", async () => {
    const { srcId, dstId } = await getTwoLocations(opsToken);
    const { productId, available } = await getSourceInventory(opsToken, srcId);

    const excessiveQty = available + 9999;

    const res = await api(opsToken)
      .post("/api/operations/transfers")
      .send({
        productId,
        sourceLocationId: srcId,
        targetLocationId: dstId,
        quantity: excessiveQty,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/insufficient/i);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 3 — Destination stock increases ONLY after RECEIVED
  // ────────────────────────────────────────────────────────────────────────────
  it("Test 3 — destination stock does NOT increase after DISPATCHED, only after RECEIVED", async () => {
    const { srcId, dstId } = await getTwoLocations(opsToken);
    const { productId } = await getSourceInventory(opsToken, srcId);

    const transferQty = 1;

    // Snapshot destination BEFORE transfer
    const destBefore = await getInventorySnapshot(opsToken, productId, dstId);

    // Create transfer
    const createRes = await api(opsToken)
      .post("/api/operations/transfers")
      .send({
        productId,
        sourceLocationId: srcId,
        targetLocationId: dstId,
        quantity: transferQty,
      });
    expect(createRes.status).toBe(201);
    const transferId: number = createRes.body.data.id;

    // Dispatch — source reduces, destination must NOT change yet
    const dispatchRes = await api(opsToken)
      .patch(`/api/operations/transfers/${transferId}/status`)
      .send({ status: "DISPATCHED" });
    expect(dispatchRes.status).toBe(200);

    const destAfterDispatch = await getInventorySnapshot(opsToken, productId, dstId);
    expect(destAfterDispatch).toBe(destBefore); // destination unchanged

    // Receive — destination must increase now
    const receiveRes = await api(opsToken)
      .patch(`/api/operations/transfers/${transferId}/status`)
      .send({ status: "RECEIVED" });
    expect(receiveRes.status).toBe(200);

    const destAfterReceive = await getInventorySnapshot(opsToken, productId, dstId);
    expect(destAfterReceive).toBe(destBefore + transferQty); // destination increased
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 4 — Same transfer cannot be received twice
  // ────────────────────────────────────────────────────────────────────────────
  it("Test 4 — same transfer cannot be received twice", async () => {
    const { srcId, dstId } = await getTwoLocations(opsToken);
    const { productId } = await getSourceInventory(opsToken, srcId);

    // Create and complete a transfer
    const createRes = await api(opsToken)
      .post("/api/operations/transfers")
      .send({
        productId,
        sourceLocationId: srcId,
        targetLocationId: dstId,
        quantity: 1,
      });
    expect(createRes.status).toBe(201);
    const transferId: number = createRes.body.data.id;

    // Dispatch
    await api(opsToken)
      .patch(`/api/operations/transfers/${transferId}/status`)
      .send({ status: "DISPATCHED" });

    // First RECEIVED — should succeed
    const firstReceive = await api(opsToken)
      .patch(`/api/operations/transfers/${transferId}/status`)
      .send({ status: "RECEIVED" });
    expect(firstReceive.status).toBe(200);

    // Second RECEIVED attempt — must be rejected
    const secondReceive = await api(opsToken)
      .patch(`/api/operations/transfers/${transferId}/status`)
      .send({ status: "RECEIVED" });
    expect(secondReceive.status).toBeGreaterThanOrEqual(400);
    expect(secondReceive.body.success).toBe(false);
  });
});
