import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

type Product = { id: number; name: string; sku: string };
type Location = { id: number; name: string; code: string };
type Customer = { id: number; customerName: string; businessName: string };
type OrderItem = { id: number; quantity: number; product: Product };
type CustomerOrder = {
  id: number;
  orderNumber: string;
  status: "RESERVED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  customer: Customer;
  location: Location;
  createdBy: { name: string; role: string };
  items: OrderItem[];
};

const STATUS_COLORS: Record<string, string> = {
  RESERVED: "#3b82f6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

export default function CustomerOrders() {
  const { user } = useAuth();
  const canCreate =
    user?.role === "ADMIN" || user?.role === "OPERATIONS" || user?.role === "SALES";
  const canUpdateStatus = user?.role === "ADMIN" || user?.role === "OPERATIONS";

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    customerId: "",
    locationId: "",
    items: [{ productId: "", quantity: "" }],
  });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [ordersRes, locRes, prodRes, custRes] = await Promise.all([
        api.get("/operations/customer-orders"),
        api.get("/locations"),
        api.get("/products?limit=100"),
        api.get("/customers?limit=100"),
      ]);
      setOrders(ordersRes.data.data || []);
      setLocations(locRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setCustomers(custRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addItem = () =>
    setForm({ ...form, items: [...form.items, { productId: "", quantity: "" }] });

  const removeItem = (idx: number) =>
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const updateItem = (
    idx: number,
    field: "productId" | "quantity",
    value: string
  ) => {
    const updated = form.items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    );
    setForm({ ...form, items: updated });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFormLoading(true);

    const items = form.items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    }));

    // Check for duplicate products
    const productIds = items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      setError("A product cannot appear more than once in an order");
      setFormLoading(false);
      return;
    }

    try {
      await api.post("/operations/customer-orders", {
        customerId: Number(form.customerId),
        locationId: Number(form.locationId),
        items,
      });
      setSuccess("Customer order created and stock reserved");
      setForm({ customerId: "", locationId: "", items: [{ productId: "", quantity: "" }] });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create order");
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/operations/customer-orders/${id}/status`, { status });
      setSuccess(
        status === "CANCELLED"
          ? "Order cancelled — reserved stock released"
          : `Order marked as ${status}`
      );
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update order");
    }
  };

  return (
    <div className="erp-layout">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Customer Orders</h1>
            <p>Reserve stock and manage customer orders</p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              onClick={() => setShowForm(!showForm)}
              id="btn-create-order"
            >
              {showForm ? "✕ Cancel" : "+ New Order"}
            </button>
          )}
        </header>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {showForm && canCreate && (
          <div className="customer-form-card">
            <h2>Create Customer Order</h2>
            <form onSubmit={handleCreate} className="customer-form" id="form-customer-order">
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                required
                id="co-customer"
              >
                <option value="">Select Customer *</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerName} — {c.businessName}
                  </option>
                ))}
              </select>

              <select
                value={form.locationId}
                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                required
                id="co-location"
              >
                <option value="">Select Location *</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>Order Items</strong>
                  <button type="button" className="btn-small" onClick={addItem}>
                    + Add Item
                  </button>
                </div>

                {form.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{ display: "flex", gap: "8px", alignItems: "center" }}
                  >
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(idx, "productId", e.target.value)}
                      required
                      style={{ flex: 2 }}
                      id={`co-item-product-${idx}`}
                    >
                      <option value="">Product *</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty *"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      required
                      style={{ flex: 1 }}
                      id={`co-item-qty-${idx}`}
                    />
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        style={{
                          background: "#ef444422",
                          color: "#ef4444",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button type="submit" disabled={formLoading} id="btn-submit-order">
                {formLoading ? "Reserving stock..." : "Create & Reserve Stock"}
              </button>
            </form>
          </div>
        )}

        <div className="table-card">
          <h2>Orders ({orders.length})</h2>
          {loading ? (
            <p>Loading...</p>
          ) : orders.length === 0 ? (
            <p>No orders found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Location</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Date</th>
                    {canUpdateStatus && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <>
                      <tr
                        key={order.id}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setExpandedOrder(
                            expandedOrder === order.id ? null : order.id
                          )
                        }
                      >
                        <td>
                          <strong>{order.orderNumber}</strong>
                        </td>
                        <td>{order.customer?.customerName || "—"}</td>
                        <td>{order.location?.name || "—"}</td>
                        <td>{order.items.length} item(s)</td>
                        <td>
                          <span
                            style={{
                              background: STATUS_COLORS[order.status] + "22",
                              color: STATUS_COLORS[order.status],
                              padding: "3px 10px",
                              borderRadius: "20px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                            }}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td>{order.createdBy?.name || "—"}</td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        {canUpdateStatus && (
                          <td onClick={(e) => e.stopPropagation()}>
                            {order.status === "RESERVED" && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  className="btn-small"
                                  style={{ background: "#10b98122", color: "#10b981" }}
                                  onClick={() =>
                                    handleStatusChange(order.id, "COMPLETED")
                                  }
                                  id={`btn-order-complete-${order.id}`}
                                >
                                  ✓ Complete
                                </button>
                                <button
                                  className="btn-small"
                                  style={{ background: "#ef444422", color: "#ef4444" }}
                                  onClick={() =>
                                    handleStatusChange(order.id, "CANCELLED")
                                  }
                                  id={`btn-order-cancel-${order.id}`}
                                >
                                  ✕ Cancel
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                      {expandedOrder === order.id && (
                        <tr key={`${order.id}-expanded`}>
                          <td
                            colSpan={canUpdateStatus ? 8 : 7}
                            style={{ padding: "0 16px 16px 32px" }}
                          >
                            <table style={{ width: "100%", fontSize: "0.85rem" }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: "left" }}>Product</th>
                                  <th style={{ textAlign: "left" }}>SKU</th>
                                  <th style={{ textAlign: "left" }}>Qty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.product.name}</td>
                                    <td>{item.product.sku}</td>
                                    <td>{item.quantity}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
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
