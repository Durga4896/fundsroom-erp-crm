import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

interface Customer {
  id: number;
  customerName: string;
  businessName?: string;
  customerType: string;
  status: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
}

interface Challan {
  id: number;
  challanNumber: string;
  totalQuantity: number;
  status: string;
  customer?: {
    customerName: string;
  };
}

export default function Dashboard() {
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);

  const [customerTotal, setCustomerTotal] = useState(0);
  const [productTotal, setProductTotal] = useState(0);
  const [challanTotal, setChallanTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [customersRes, productsRes, challansRes] =
          await Promise.all([
            api.get("/customers", {
              params: {
                page: 1,
                limit: 5,
              },
            }),

            api.get("/products", {
              params: {
                page: 1,
                limit: 100,
              },
            }),

            api.get("/challans", {
              params: {
                page: 1,
                limit: 5,
              },
            }),
          ]);

        setCustomers(customersRes.data.data || []);
        setProducts(productsRes.data.data || []);
        setChallans(challansRes.data.data || []);

        setCustomerTotal(
          customersRes.data.pagination?.total ??
            customersRes.data.data?.length ??
            0
        );

        setProductTotal(
          productsRes.data.pagination?.total ??
            productsRes.data.data?.length ??
            0
        );

        setChallanTotal(
          challansRes.data.pagination?.total ??
            challansRes.data.data?.length ??
            0
        );
      } catch (err: any) {
        console.error("Failed to load dashboard:", err);

        setError(
          err.response?.data?.message ||
            "Failed to load dashboard data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const lowStockProducts = products.filter(
    (product) =>
      product.currentStock <= product.minimumStock
  );

  const confirmedChallans = challans.filter(
    (challan) => challan.status === "CONFIRMED"
  );

  const draftChallans = challans.filter(
    (challan) => challan.status === "DRAFT"
  );

  const cancelledChallans = challans.filter(
    (challan) => challan.status === "CANCELLED"
  );

  return (
    <div className="erp-layout">
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Overview of your ERP operations</p>
          </div>

          <div className="user-info">
            <div className="avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{user?.name}</strong>
              <span>{user?.role}</span>
            </div>
          </div>
        </header>

        <section className="welcome-banner">
          <div>
            <h2>
              Welcome back,{" "}
              {user?.name?.split(" ")[0]} 👋
            </h2>

            <p>
              Here's what's happening with your
              business today.
            </p>
          </div>

          <div className="banner-date">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </section>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">
            Loading dashboard...
          </div>
        ) : (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon customers-icon">
                  ♙
                </div>

                <div>
                  <span>Total Customers</span>
                  <strong>{customerTotal}</strong>
                  <small>CRM records</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon products-icon">
                  ▤
                </div>

                <div>
                  <span>Total Products</span>
                  <strong>{productTotal}</strong>
                  <small>Products in inventory</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon challan-icon">
                  ▣
                </div>

                <div>
                  <span>Total Challans</span>
                  <strong>{challanTotal}</strong>
                  <small>Sales challans</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon stock-icon">
                  ◈
                </div>

                <div>
                  <span>Low Stock</span>
                  <strong>
                    {lowStockProducts.length}
                  </strong>
                  <small>Need attention</small>
                </div>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  ✓
                </div>

                <div>
                  <span>Confirmed</span>
                  <strong>
                    {confirmedChallans.length}
                  </strong>
                  <small>Recent challans</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  ◷
                </div>

                <div>
                  <span>Drafts</span>
                  <strong>
                    {draftChallans.length}
                  </strong>
                  <small>Pending confirmation</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  ×
                </div>

                <div>
                  <span>Cancelled</span>
                  <strong>
                    {cancelledChallans.length}
                  </strong>
                  <small>Recent challans</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  📦
                </div>

                <div>
                  <span>Total Stock Units</span>
                  <strong>
                    {products.reduce(
                      (total, product) =>
                        total + product.currentStock,
                      0
                    )}
                  </strong>

                  <small>Across loaded products</small>
                </div>
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Recent Customers</h3>
                    <p>Latest customer records</p>
                  </div>

                  <a href="/customers">
                    View all
                  </a>
                </div>

                {customers.length === 0 ? (
                  <div className="empty-state">
                    No customers found.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Business</th>
                          <th>Type</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {customers.map(
                          (customer) => (
                            <tr key={customer.id}>
                              <td>
                                <strong>
                                  {customer.customerName}
                                </strong>
                              </td>

                              <td>
                                {customer.businessName ||
                                  "-"}
                              </td>

                              <td>
                                <span className="type-badge">
                                  {customer.customerType}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`status-badge ${customer.status.toLowerCase()}`}
                                >
                                  {customer.status}
                                </span>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Recent Challans</h3>
                    <p>Latest sales activity</p>
                  </div>

                  <a href="/challans">
                    View all
                  </a>
                </div>

                {challans.length === 0 ? (
                  <div className="empty-state">
                    No challans found.
                  </div>
                ) : (
                  <div className="challan-list">
                    {challans.map(
                      (challan) => (
                        <div
                          className="challan-item"
                          key={challan.id}
                        >
                          <div className="challan-number">
                            <strong>
                              {challan.challanNumber}
                            </strong>

                            <span>
                              {challan.customer
                                ?.customerName ||
                                "Unknown customer"}
                            </span>
                          </div>

                          <div className="challan-right">
                            <strong>
                              {challan.totalQuantity}
                            </strong>

                            <span
                              className={`status-badge ${challan.status.toLowerCase()}`}
                            >
                              {challan.status}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Inventory Alerts</h3>
                  <p>
                    Products that need stock attention
                  </p>
                </div>

                <a href="/inventory">
                  View inventory
                </a>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="success-state">
                  ✓ All products are currently above
                  their minimum stock level.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Current Stock</th>
                        <th>Minimum Stock</th>
                      </tr>
                    </thead>

                    <tbody>
                      {lowStockProducts.map(
                        (product) => (
                          <tr key={product.id}>
                            <td>
                              <strong>
                                {product.name}
                              </strong>
                            </td>

                            <td>
                              {product.sku}
                            </td>

                            <td className="stock-warning">
                              {product.currentStock}
                            </td>

                            <td>
                              {product.minimumStock}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
