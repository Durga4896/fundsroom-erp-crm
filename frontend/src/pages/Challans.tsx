import { useEffect, useState } from "react";
import api from "../api/axios";

type Customer = {
  id: number;
  customerName: string;
  businessName?: string;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  unitPrice: string | number;
  currentStock: number;
};

type ChallanItem = {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  unitPrice: string | number;
  quantity: number;
};

type Challan = {
  id: number;
  challanNumber: string;
  customerId: number;
  totalQuantity: number;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
  customer: Customer;
  items: ChallanItem[];
};

type NewItem = {
  productId: string;
  quantity: string;
};

export default function Challans() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<NewItem[]>([
    {
      productId: "",
      quantity: "",
    },
  ]);

  const loadChallans = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/challans", {
        params: {
          page: 1,
          limit: 50,
        },
      });

      setChallans(response.data.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load challans"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get("/customers", {
        params: {
          page: 1,
          limit: 100,
        },
      });

      setCustomers(response.data.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load customers"
      );
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get("/products", {
        params: {
          page: 1,
          limit: 100,
        },
      });

      setProducts(response.data.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load products"
      );
    }
  };

  useEffect(() => {
    loadChallans();
    loadCustomers();
    loadProducts();
  }, []);

  const resetForm = () => {
    setCustomerId("");

    setItems([
      {
        productId: "",
        quantity: "",
      },
    ]);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: "",
        quantity: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      return;
    }

    setItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateItem = (
    index: number,
    field: keyof NewItem,
    value: string
  ) => {
    setItems(
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.productId &&
        item.quantity &&
        Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      setError("Please add at least one valid product");
      return;
    }

    try {
      setSaving(true);

      await api.post("/challans", {
        customerId: Number(customerId),
        items: validItems.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
        })),
      });

      setSuccess("Challan created successfully");

      resetForm();
      setShowForm(false);

      await loadChallans();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to create challan"
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmChallan = async (id: number) => {
    if (!window.confirm("Confirm this challan?")) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.post(`/challans/${id}/confirm`);

      setSuccess("Challan confirmed successfully");

      await loadChallans();
      await loadProducts();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to confirm challan"
      );
    }
  };

  const cancelChallan = async (id: number) => {
    if (!window.confirm("Cancel this draft challan?")) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.post(`/challans/${id}/cancel`);

      setSuccess("Challan cancelled successfully");

      await loadChallans();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to cancel challan"
      );
    }
  };

  const getStatusClass = (status: Challan["status"]) => {
    if (status === "CONFIRMED") {
      return "status-active";
    }

    if (status === "CANCELLED") {
      return "status-inactive";
    }

    return "badge";
  };

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Challans</h1>
          <p>
            Create, confirm and manage sales challans.
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
            setError("");
            setSuccess("");
          }}
        >
          {showForm ? "Close" : "+ Create Challan"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {success && (
        <div className="success">
          {success}
        </div>
      )}

      {showForm && (
        <div className="customer-form-card">
          <h2>Create Challan</h2>

          <form
            onSubmit={handleCreate}
            className="customer-form"
          >
            <select
              value={customerId}
              onChange={(e) =>
                setCustomerId(e.target.value)
              }
              required
            >
              <option value="">
                Select Customer *
              </option>

              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.customerName}
                  {customer.businessName
                    ? ` - ${customer.businessName}`
                    : ""}
                </option>
              ))}
            </select>

            {items.map((item, index) => (
              <div
                key={index}
                className="challan-item-row"
              >
                <select
                  value={item.productId}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "productId",
                      e.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select Product *
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name} ({product.sku}) -
                      Stock: {product.currentStock}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  placeholder="Quantity *"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "quantity",
                      e.target.value
                    )
                  }
                  required
                />

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      removeItem(index)
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
            >
              + Add Another Product
            </button>

            <button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Create Challan"}
            </button>
          </form>
        </div>
      )}

      <div className="table-card">
        {loading ? (
          <p>Loading challans...</p>
        ) : challans.length === 0 ? (
          <p>No challans found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Challan</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total Qty</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {challans.map((challan) => (
                <tr key={challan.id}>
                  <td>
                    <strong>
                      {challan.challanNumber}
                    </strong>
                  </td>

                  <td>
                    {challan.customer?.customerName ||
                      "-"}
                  </td>

                  <td>
                    {challan.items?.length || 0}
                  </td>

                  <td>
                    <strong>
                      {challan.totalQuantity}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={getStatusClass(
                        challan.status
                      )}
                    >
                      {challan.status}
                    </span>
                  </td>

                  <td>
                    {new Date(
                      challan.createdAt
                    ).toLocaleDateString()}
                  </td>

                  <td>
                    {challan.status === "DRAFT" && (
                      <div className="challan-actions">
                        <button
                          onClick={() =>
                            confirmChallan(
                              challan.id
                            )
                          }
                        >
                          Confirm
                        </button>

                        <button
                          onClick={() =>
                            cancelChallan(
                              challan.id
                            )
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {challan.status ===
                      "CONFIRMED" && (
                      <span>Completed</span>
                    )}

                    {challan.status ===
                      "CANCELLED" && (
                      <span>Cancelled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
