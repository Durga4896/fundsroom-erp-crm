import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

type Product = { id: number; name: string; sku: string };
type Location = { id: number; name: string; code: string };
type Transfer = {
  id: number;
  transferNumber: string;
  quantity: number;
  status: "REQUESTED" | "DISPATCHED" | "RECEIVED";
  createdAt: string;
  product: Product;
  sourceLocation: Location;
  targetLocation: Location;
  createdBy: { name: string; role: string };
};

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "#6366f1",
  DISPATCHED: "#f59e0b",
  RECEIVED: "#10b981",
};

export default function Transfers() {
  const { user } = useAuth();
  const canCreate = user?.role === "ADMIN" || user?.role === "OPERATIONS";

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    productId: "",
    sourceLocationId: "",
    targetLocationId: "",
    quantity: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [trRes, locRes, prodRes] = await Promise.all([
        api.get("/operations/transfers"),
        api.get("/locations"),
        api.get("/products?limit=100"),
      ]);
      setTransfers(trRes.data.data || []);
      setLocations(locRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.sourceLocationId === form.targetLocationId) {
      setError("Source and target locations must be different");
      return;
    }
    setFormLoading(true);
    try {
      await api.post("/operations/transfers", {
        productId: Number(form.productId),
        sourceLocationId: Number(form.sourceLocationId),
        targetLocationId: Number(form.targetLocationId),
        quantity: Number(form.quantity),
      });
      setSuccess("Transfer request created");
      setForm({ productId: "", sourceLocationId: "", targetLocationId: "", quantity: "" });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create transfer");
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/operations/transfers/${id}/status`, { status });
      setSuccess(`Transfer marked as ${status}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update transfer");
    }
  };

  const nextStatus: Record<string, string> = {
    REQUESTED: "DISPATCHED",
    DISPATCHED: "RECEIVED",
  };

  return (
    <div className="erp-layout">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Internal Transfers</h1>
            <p>Move stock between warehouse locations</p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              onClick={() => setShowForm(!showForm)}
              id="btn-create-transfer"
            >
              {showForm ? "✕ Cancel" : "+ New Transfer"}
            </button>
          )}
        </header>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {/* Transfer State Flow Info */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            padding: "12px 20px",
            background: "var(--card-bg)",
            borderRadius: "12px",
            marginBottom: "20px",
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 700, color: STATUS_COLORS.REQUESTED }}>
            REQUESTED
          </span>
          <span>→ (Dispatch: source stock reduces)</span>
          <span style={{ fontWeight: 700, color: STATUS_COLORS.DISPATCHED }}>
            DISPATCHED
          </span>
          <span>→ (Receive: destination stock increases)</span>
          <span style={{ fontWeight: 700, color: STATUS_COLORS.RECEIVED }}>
            RECEIVED
          </span>
        </div>

        {showForm && canCreate && (
          <div className="customer-form-card">
            <h2>Create Transfer Request</h2>
            <form onSubmit={handleCreate} className="customer-form" id="form-transfer">
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                required
                id="tr-product"
              >
                <option value="">Select Product *</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>

              <select
                value={form.sourceLocationId}
                onChange={(e) => setForm({ ...form, sourceLocationId: e.target.value })}
                required
                id="tr-source"
              >
                <option value="">Source Location *</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>

              <select
                value={form.targetLocationId}
                onChange={(e) => setForm({ ...form, targetLocationId: e.target.value })}
                required
                id="tr-dest"
              >
                <option value="">Destination Location *</option>
                {locations
                  .filter((l) => l.id !== Number(form.sourceLocationId))
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
              </select>

              <input
                type="number"
                min="1"
                placeholder="Quantity *"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
                id="tr-qty"
              />

              <button type="submit" disabled={formLoading} id="btn-submit-transfer">
                {formLoading ? "Creating..." : "Request Transfer"}
              </button>
            </form>
          </div>
        )}

        <div className="table-card">
          <h2>Transfers ({transfers.length})</h2>
          {loading ? (
            <p>Loading...</p>
          ) : transfers.length === 0 ? (
            <p>No transfers found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Transfer #</th>
                    <th>Product</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Date</th>
                    {canCreate && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((tr) => (
                    <tr key={tr.id}>
                      <td>
                        <strong>{tr.transferNumber}</strong>
                      </td>
                      <td>{tr.product.name}</td>
                      <td>{tr.sourceLocation.name}</td>
                      <td>{tr.targetLocation.name}</td>
                      <td>{tr.quantity}</td>
                      <td>
                        <span
                          style={{
                            background: STATUS_COLORS[tr.status] + "22",
                            color: STATUS_COLORS[tr.status],
                            padding: "3px 10px",
                            borderRadius: "20px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tr.status}
                        </span>
                      </td>
                      <td>{tr.createdBy?.name || "—"}</td>
                      <td>
                        {new Date(tr.createdAt).toLocaleDateString()}
                      </td>
                      {canCreate && (
                        <td>
                          {nextStatus[tr.status] && (
                            <button
                              className="btn-small"
                              onClick={() =>
                                handleStatusChange(tr.id, nextStatus[tr.status])
                              }
                              id={`btn-tr-status-${tr.id}`}
                            >
                              {tr.status === "REQUESTED"
                                ? "→ Dispatch"
                                : "→ Receive"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
