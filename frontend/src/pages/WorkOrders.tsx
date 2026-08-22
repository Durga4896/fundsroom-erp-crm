import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

type User = { id: number; name: string; email: string; role: string };
type Product = { id: number; name: string; sku: string };
type Location = { id: number; name: string; code: string };
type WorkOrder = {
  id: number;
  workOrderNumber: string;
  requiredQuantity: number;
  availableInventory?: number;
  shortage?: number;
  status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
  product: Product;
  location: Location;
  assignedUser: User;
  createdBy: User;
};

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#10b981",
};

export default function WorkOrders() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    productId: "",
    locationId: "",
    requiredQuantity: "",
    assignedUserId: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [woRes, locRes, prodRes] = await Promise.all([
        api.get("/operations/work-orders"),
        api.get("/locations"),
        api.get("/products?limit=100"),
      ]);
      setWorkOrders(woRes.data.data || []);
      setLocations(locRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load work orders");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Fetch users (only ADMIN can do this to assign work orders)
      const res = await api.get("/auth/users");
      setUsers(res.data.data || []);
    } catch {
      // If endpoint not available, fall back to empty (admin assigns self)
    }
  };

  useEffect(() => {
    load();
    if (isAdmin) loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFormLoading(true);
    try {
      await api.post("/operations/work-orders", {
        productId: Number(form.productId),
        locationId: Number(form.locationId),
        requiredQuantity: Number(form.requiredQuantity),
        assignedUserId: Number(form.assignedUserId),
      });
      setSuccess("Work order created successfully");
      setForm({ productId: "", locationId: "", requiredQuantity: "", assignedUserId: "" });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create work order");
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/operations/work-orders/${id}/status`, { status });
      setSuccess(`Status updated to ${status}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  const nextStatus: Record<string, string> = {
    ASSIGNED: "IN_PROGRESS",
    IN_PROGRESS: "COMPLETED",
  };

  return (
    <div className="erp-layout">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Work Orders</h1>
            <p>Manage production and operations work orders</p>
          </div>
          {isAdmin && (
            <button
              className="btn-primary"
              onClick={() => setShowForm(!showForm)}
              id="btn-create-work-order"
            >
              {showForm ? "✕ Cancel" : "+ New Work Order"}
            </button>
          )}
        </header>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {showForm && isAdmin && (
          <div className="customer-form-card">
            <h2>Create Work Order</h2>
            <form onSubmit={handleCreate} className="customer-form" id="form-work-order">
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                required
                id="wo-product"
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
                id="wo-location"
              >
                <option value="">Select Location *</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                placeholder="Required Quantity *"
                value={form.requiredQuantity}
                onChange={(e) => setForm({ ...form, requiredQuantity: e.target.value })}
                required
                id="wo-qty"
              />

              <select
                value={form.assignedUserId}
                onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}
                required
                id="wo-assigned-user"
              >
                <option value="">Assign to User *</option>
                {users.length > 0 ? (
                  users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))
                ) : (
                  // Fallback: ask for user ID manually if /auth/users not available
                  <option value="">Enter user ID below</option>
                )}
              </select>

              {users.length === 0 && (
                <input
                  type="number"
                  min="1"
                  placeholder="Assigned User ID *"
                  value={form.assignedUserId}
                  onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}
                  required
                  id="wo-assigned-user-id"
                />
              )}

              <button type="submit" disabled={formLoading} id="btn-submit-work-order">
                {formLoading ? "Creating..." : "Create Work Order"}
              </button>
            </form>
          </div>
        )}

        <div className="table-card">
          <h2>Work Orders ({workOrders.length})</h2>
          {loading ? (
            <p>Loading...</p>
          ) : workOrders.length === 0 ? (
            <p>No work orders found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>WO #</th>
                    <th>Product</th>
                    <th>Location</th>
                    <th>Required Qty</th>
                    <th>Available</th>
                    <th>Shortage</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                    {(user?.role === "ADMIN" || user?.role === "OPERATIONS") && (
                      <th>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => (
                    <tr key={wo.id}>
                      <td>
                        <strong>{wo.workOrderNumber}</strong>
                      </td>
                      <td>{wo.product.name}</td>
                      <td>{wo.location.name}</td>
                      <td>{wo.requiredQuantity}</td>
                      <td>
                        {wo.availableInventory !== undefined
                          ? wo.availableInventory
                          : "—"}
                      </td>
                      <td>
                        {wo.shortage !== undefined && wo.shortage > 0 ? (
                          <span style={{ color: "#ef4444", fontWeight: 700 }}>
                            -{wo.shortage}
                          </span>
                        ) : (
                          <span style={{ color: "#10b981" }}>0</span>
                        )}
                      </td>
                      <td>{wo.assignedUser?.name || "—"}</td>
                      <td>
                        <span
                          style={{
                            background: STATUS_COLORS[wo.status] + "22",
                            color: STATUS_COLORS[wo.status],
                            padding: "3px 10px",
                            borderRadius: "20px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {wo.status.replace("_", " ")}
                        </span>
                      </td>
                      {(user?.role === "ADMIN" || user?.role === "OPERATIONS") && (
                        <td>
                          {nextStatus[wo.status] && (
                            <button
                              className="btn-small"
                              onClick={() =>
                                handleStatusChange(wo.id, nextStatus[wo.status])
                              }
                              id={`btn-wo-status-${wo.id}`}
                            >
                              → {nextStatus[wo.status].replace("_", " ")}
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
