import { useEffect, useState } from "react";
import api from "../api/axios";

type FollowUp = {
  id: number;
  note: string;
  followUpDate: string;
  createdAt: string;
  createdBy?: {
    name: string;
    email: string;
  };
};

type Customer = {
  id: number;
  customerName: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: string;
  address?: string;
  status: string;
  followUpDate?: string;
  notes?: string;
  followUps?: FollowUp[];
};

const emptyForm = {
  customerName: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  customerType: "WHOLESALE",
  address: "",
  status: "ACTIVE",
  followUpDate: "",
  notes: "",
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(
    null
  );
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(
    null
  );

  const [form, setForm] = useState(emptyForm);

  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers", {
        params: {
          search: search || undefined,
          page: 1,
          limit: 10,
        },
      });

      setCustomers(response.data.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load customers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError("");

      const payload = {
        ...form,
        followUpDate: form.followUpDate
          ? new Date(form.followUpDate).toISOString()
          : undefined,
      };

      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
      } else {
        await api.post("/customers", payload);
      }

      setForm(emptyForm);
      setShowForm(false);
      setEditingCustomer(null);

      await loadCustomers();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          `Failed to ${editingCustomer ? "update" : "create"} customer`
      );
    }
  };

  const startEdit = (customer: Customer) => {
    setEditingCustomer(customer);

    setForm({
      customerName: customer.customerName,
      mobile: customer.mobile,
      email: customer.email || "",
      businessName: customer.businessName || "",
      gstNumber: customer.gstNumber || "",
      customerType: customer.customerType,
      address: customer.address || "",
      status: customer.status,
      followUpDate: customer.followUpDate
        ? new Date(customer.followUpDate).toISOString().slice(0, 16)
        : "",
      notes: customer.notes || "",
    });

    setShowForm(true);
    setViewingCustomer(null);
  };

  const viewCustomer = async (id: number) => {
    try {
      setError("");

      const response = await api.get(`/customers/${id}`);

      setViewingCustomer(response.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load customer details"
      );
    }
  };

  const addFollowUp = async () => {
    if (!viewingCustomer || !followUpNote || !followUpDate) {
      setError("Follow-up note and date are required");
      return;
    }

    try {
      setError("");

      await api.post(
        `/customers/${viewingCustomer.id}/follow-ups`,
        {
          note: followUpNote,
          followUpDate: new Date(followUpDate).toISOString(),
        }
      );

      setFollowUpNote("");
      setFollowUpDate("");

      await viewCustomer(viewingCustomer.id);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to add follow-up"
      );
    }
  };

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Manage your customer records and follow-ups.</p>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setForm(emptyForm);
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Close" : "+ Add Customer"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="customer-form-card">
          <h2>
            {editingCustomer ? "Edit Customer" : "Add Customer"}
          </h2>

          <form onSubmit={handleSubmit} className="customer-form">
            <input
              name="customerName"
              placeholder="Customer Name *"
              value={form.customerName}
              onChange={handleChange}
              required
            />

            <input
              name="mobile"
              placeholder="Mobile *"
              value={form.mobile}
              onChange={handleChange}
              required
            />

            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
            />

            <input
              name="businessName"
              placeholder="Business Name"
              value={form.businessName}
              onChange={handleChange}
            />

            <input
              name="gstNumber"
              placeholder="GST Number"
              value={form.gstNumber}
              onChange={handleChange}
            />

            <select
              name="customerType"
              value={form.customerType}
              onChange={handleChange}
            >
              <option value="WHOLESALE">Wholesale</option>
              <option value="RETAIL">Retail</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <input
              name="followUpDate"
              type="datetime-local"
              value={form.followUpDate}
              onChange={handleChange}
            />

            <textarea
              name="address"
              placeholder="Address"
              value={form.address}
              onChange={handleChange}
            />

            <textarea
              name="notes"
              placeholder="Notes"
              value={form.notes}
              onChange={handleChange}
            />

            <button type="submit">
              {editingCustomer
                ? "Update Customer"
                : "Create Customer"}
            </button>
          </form>
        </div>
      )}

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card">
        {loading ? (
          <p>Loading customers...</p>
        ) : customers.length === 0 ? (
          <p>No customers found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Business</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.customerName}</strong>
                    <small>{customer.email}</small>
                  </td>

                  <td>{customer.businessName || "-"}</td>

                  <td>{customer.mobile}</td>

                  <td>
                    <span className="badge">
                      {customer.customerType}
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        customer.status === "ACTIVE"
                          ? "status-active"
                          : "status-inactive"
                      }
                    >
                      {customer.status}
                    </span>
                  </td>

                  <td>
                    {customer.followUpDate
                      ? new Date(
                          customer.followUpDate
                        ).toLocaleDateString()
                      : "-"}
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button
                        className="small-button"
                        onClick={() => viewCustomer(customer.id)}
                      >
                        View
                      </button>

                      <button
                        className="small-button edit-button"
                        onClick={() => startEdit(customer)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewingCustomer && (
        <div className="modal-overlay">
          <div className="customer-modal">
            <div className="modal-header">
              <div>
                <h2>{viewingCustomer.customerName}</h2>
                <p>
                  {viewingCustomer.businessName || "Customer Details"}
                </p>
              </div>

              <button
                className="close-button"
                onClick={() => setViewingCustomer(null)}
              >
                ×
              </button>
            </div>

            <div className="customer-details">
              <div>
                <strong>Mobile</strong>
                <span>{viewingCustomer.mobile}</span>
              </div>

              <div>
                <strong>Email</strong>
                <span>{viewingCustomer.email || "-"}</span>
              </div>

              <div>
                <strong>GST Number</strong>
                <span>{viewingCustomer.gstNumber || "-"}</span>
              </div>

              <div>
                <strong>Customer Type</strong>
                <span>{viewingCustomer.customerType}</span>
              </div>

              <div>
                <strong>Status</strong>
                <span>{viewingCustomer.status}</span>
              </div>

              <div>
                <strong>Address</strong>
                <span>{viewingCustomer.address || "-"}</span>
              </div>

              <div className="full-width">
                <strong>Notes</strong>
                <span>{viewingCustomer.notes || "-"}</span>
              </div>
            </div>

            <hr />

            <h3>Follow-ups</h3>

            {viewingCustomer.followUps &&
            viewingCustomer.followUps.length > 0 ? (
              <div className="follow-up-list">
                {viewingCustomer.followUps.map((followUp) => (
                  <div className="follow-up-item" key={followUp.id}>
                    <strong>{followUp.note}</strong>

                    <span>
                      {new Date(
                        followUp.followUpDate
                      ).toLocaleString()}
                    </span>

                    <small>
                      Created by{" "}
                      {followUp.createdBy?.name || "System"}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p>No follow-ups yet.</p>
            )}

            <div className="follow-up-form">
              <h3>Add Follow-up</h3>

              <textarea
                placeholder="Follow-up note"
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
              />

              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />

              <button onClick={addFollowUp}>
                Add Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
