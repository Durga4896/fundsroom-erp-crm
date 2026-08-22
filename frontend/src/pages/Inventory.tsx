import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

type Product = { id: number; name: string; sku: string; category: string };
type Location = { id: number; name: string; code: string };
type InventoryRecord = {
  id: number;
  batchNumber: string;
  physicalQuantity: number;
  reservedQuantity: number;
  product: Product;
  location: Location;
  updatedAt: string;
};

export default function Inventory() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "OPERATIONS";

  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [adjLoading, setAdjLoading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [filterProduct, setFilterProduct] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // Create inventory form
  const [form, setForm] = useState({
    productId: "",
    locationId: "",
    batchNumber: "",
    physicalQuantity: "",
    reservedQuantity: "0",
  });

  // Adjust form
  const [adjForm, setAdjForm] = useState<{
    id: number | null;
    movementType: "IN" | "OUT";
    quantity: string;
    reason: string;
  }>({ id: null, movementType: "IN", quantity: "", reason: "" });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const params: Record<string, string> = {};
      if (filterProduct) params.productId = filterProduct;
      if (filterLocation) params.locationId = filterLocation;

      const [invRes, locRes, prodRes] = await Promise.all([
        api.get("/inventory", { params }),
        api.get("/locations"),
        api.get("/products?limit=100"),
      ]);
      setInventory(invRes.data.data || []);
      setLocations(locRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterProduct, filterLocation]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFormLoading(true);
    try {
      await api.post("/inventory", {
        productId: Number(form.productId),
        locationId: Number(form.locationId),
        batchNumber: form.batchNumber.trim(),
        physicalQuantity: Number(form.physicalQuantity),
        reservedQuantity: Number(form.reservedQuantity),
      });
      setSuccess("Inventory record created");
      setForm({ productId: "", locationId: "", batchNumber: "", physicalQuantity: "", reservedQuantity: "0" });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create inventory");
    } finally {
      setFormLoading(false);
    }
  };

  const openAdj = (id: number) =>
    setAdjForm({ id, movementType: "IN", quantity: "", reason: "" });

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjForm.id) return;
    setError("");
    setSuccess("");
    setAdjLoading(adjForm.id);
    try {
      await api.patch(`/inventory/${adjForm.id}/adjust`, {
        movementType: adjForm.movementType,
        quantity: Number(adjForm.quantity),
        reason: adjForm.reason.trim(),
      });
      setSuccess(`Stock ${adjForm.movementType === "IN" ? "added" : "removed"} successfully`);
      setAdjForm({ id: null, movementType: "IN", quantity: "", reason: "" });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to adjust inventory");
    } finally {
      setAdjLoading(null);
    }
  };

  const totalPhysical = inventory.reduce((s, r) => s + r.physicalQuantity, 0);
  const totalReserved = inventory.reduce((s, r) => s + r.reservedQuantity, 0);
  const totalAvailable = totalPhysical - totalReserved;

  return (
    <div className="erp-layout">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Inventory</h1>
            <p>Manage stock by product, location and batch</p>
          </div>
          {canManage && (
            <button
              className="btn-primary"
              onClick={() => setShowForm(!showForm)}
              id="btn-create-inventory"
            >
              {showForm ? "✕ Cancel" : "+ Add Inventory"}
            </button>
          )}
        </header>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {/* Summary Stats */}
        <section className="stats-grid" style={{ marginBottom: "20px" }}>
          <div className="stat-card">
            <div className="stat-icon stock-icon">◈</div>
            <div>
              <span>Physical Stock</span>
              <strong>{totalPhysical}</strong>
              <small>Total units on hand</small>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">◷</div>
            <div>
              <span>Reserved</span>
              <strong>{totalReserved}</strong>
              <small>Committed to orders</small>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✓</div>
            <div>
              <span>Available</span>
              <strong style={{ color: totalAvailable > 0 ? "#10b981" : "#ef4444" }}>
                {totalAvailable}
              </strong>
              <small>Ready to sell / transfer</small>
            </div>
          </div>
        </section>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            style={{ flex: 1, minWidth: "180px" }}
            id="inv-filter-product"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            style={{ flex: 1, minWidth: "180px" }}
            id="inv-filter-location"
          >
            <option value="">All Locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Create Inventory Form */}
        {showForm && canManage && (
          <div className="customer-form-card">
            <h2>Add Opening Inventory</h2>
            <form onSubmit={handleCreate} className="customer-form" id="form-inventory">
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                required
                id="inv-product"
              >
                <option value="">Select Product *</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              <select
                value={form.locationId}
                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                required
                id="inv-location"
              >
                <option value="">Select Location *</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Batch Number * (e.g. BATCH-001)"
                value={form.batchNumber}
                onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                required
                id="inv-batch"
              />
              <input
                type="number"
                min="0"
                placeholder="Physical Quantity *"
                value={form.physicalQuantity}
                onChange={(e) => setForm({ ...form, physicalQuantity: e.target.value })}
                required
                id="inv-physical-qty"
              />
              <input
                type="number"
                min="0"
                placeholder="Reserved Quantity (default 0)"
                value={form.reservedQuantity}
                onChange={(e) => setForm({ ...form, reservedQuantity: e.target.value })}
                id="inv-reserved-qty"
              />
              <button type="submit" disabled={formLoading} id="btn-submit-inventory">
                {formLoading ? "Creating..." : "Add Inventory"}
              </button>
            </form>
          </div>
        )}

        {/* Adjust Form Modal */}
        {adjForm.id !== null && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              className="customer-form-card"
              style={{ width: "400px", maxWidth: "95vw" }}
            >
              <h2>Adjust Inventory</h2>
              <form onSubmit={handleAdjust} className="customer-form" id="form-adjust">
                <select
                  value={adjForm.movementType}
                  onChange={(e) =>
                    setAdjForm({ ...adjForm, movementType: e.target.value as "IN" | "OUT" })
                  }
                  id="adj-type"
                >
                  <option value="IN">Stock IN (add)</option>
                  <option value="OUT">Stock OUT (remove)</option>
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Quantity *"
                  value={adjForm.quantity}
                  onChange={(e) => setAdjForm({ ...adjForm, quantity: e.target.value })}
                  required
                  id="adj-qty"
                />
                <input
                  type="text"
                  placeholder="Reason *"
                  value={adjForm.reason}
                  onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  required
                  id="adj-reason"
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="submit" disabled={adjLoading !== null} style={{ flex: 1 }}>
                    {adjLoading !== null ? "Saving..." : "Save Adjustment"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjForm({ id: null, movementType: "IN", quantity: "", reason: "" })}
                    style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="table-card">
          <h2>Inventory Records ({inventory.length})</h2>
          {loading ? (
            <p>Loading...</p>
          ) : inventory.length === 0 ? (
            <p>No inventory records found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Batch</th>
                    <th>Physical Qty</th>
                    <th>Reserved Qty</th>
                    <th>Available Qty</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((rec) => {
                    const available = rec.physicalQuantity - rec.reservedQuantity;
                    return (
                      <tr key={rec.id}>
                        <td>
                          <strong>{rec.product.name}</strong>
                        </td>
                        <td>{rec.product.sku}</td>
                        <td>
                          <span className="badge">{rec.product.category}</span>
                        </td>
                        <td>{rec.location.name}</td>
                        <td>
                          <code style={{ fontSize: "0.78rem" }}>{rec.batchNumber}</code>
                        </td>
                        <td>{rec.physicalQuantity}</td>
                        <td>{rec.reservedQuantity}</td>
                        <td>
                          <strong
                            style={{
                              color: available > 0 ? "#10b981" : "#ef4444",
                            }}
                          >
                            {available}
                          </strong>
                        </td>
                        {canManage && (
                          <td>
                            <button
                              className="btn-small"
                              onClick={() => openAdj(rec.id)}
                              id={`btn-adjust-${rec.id}`}
                            >
                              Adjust
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
