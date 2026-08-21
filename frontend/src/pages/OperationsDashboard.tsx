import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";

interface DashboardData {
  inventory: {
    totalPhysicalStock: number;
    totalReservedStock: number;
    totalAvailableStock: number;
    lowStockCount: number;
    lowStockProducts: Array<{
      id: number;
      name: string;
      sku: string;
      availableStock: number;
      minimumStock: number;
    }>;
    products: Array<{
      id: number;
      name: string;
      sku: string;
      physicalStock: number;
      reservedStock: number;
      availableStock: number;
      minimumStock: number;
    }>;
  };
  customers: {
    total: number;
    byStatus: Record<string, number>;
  };
  workOrders: {
    total: number;
    byStatus: Record<string, number>;
  };
  transfers: {
    total: number;
    byStatus: Record<string, number>;
  };
  customerOrders: {
    total: number;
    byStatus: Record<string, number>;
  };
  stockMovements: {
    totalStockIn: number;
    totalStockOut: number;
  };
}

export default function OperationsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/operations/dashboard");

        setData(response.data.data);
      } catch (err: any) {
        console.error("Failed to load operations dashboard:", err);

        setError(
          err.response?.data?.message ||
            "Failed to load operations dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="erp-layout">
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Operations Dashboard</h1>
            <p>Inventory and operations overview</p>
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="loading">Loading operations dashboard...</div>
        ) : data ? (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon stock-icon">◈</div>
                <div>
                  <span>Physical Stock</span>
                  <strong>{data.inventory.totalPhysicalStock}</strong>
                  <small>Units in inventory</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">◷</div>
                <div>
                  <span>Reserved Stock</span>
                  <strong>{data.inventory.totalReservedStock}</strong>
                  <small>Currently reserved</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">✓</div>
                <div>
                  <span>Available Stock</span>
                  <strong>{data.inventory.totalAvailableStock}</strong>
                  <small>Ready for orders</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⚠</div>
                <div>
                  <span>Low Stock</span>
                  <strong>{data.inventory.lowStockCount}</strong>
                  <small>Products requiring attention</small>
                </div>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon customers-icon">♙</div>
                <div>
                  <span>Customers</span>
                  <strong>{data.customers.total}</strong>
                  <small>Operations customers</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">▣</div>
                <div>
                  <span>Customer Orders</span>
                  <strong>{data.customerOrders.total}</strong>
                  <small>All customer orders</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⚙</div>
                <div>
                  <span>Work Orders</span>
                  <strong>{data.workOrders.total}</strong>
                  <small>All work orders</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⇄</div>
                <div>
                  <span>Transfers</span>
                  <strong>{data.transfers.total}</strong>
                  <small>Stock transfers</small>
                </div>
              </div>
            </section>

            <section className="operations-grid">
              <div className="table-card">
                <h2>Customer Orders</h2>

                {Object.entries(data.customerOrders.byStatus).map(
                  ([status, count]) => (
                    <div className="status-row" key={status}>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                  )
                )}
              </div>

              <div className="table-card">
                <h2>Work Orders</h2>

                {Object.entries(data.workOrders.byStatus).map(
                  ([status, count]) => (
                    <div className="status-row" key={status}>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                  )
                )}
              </div>

              <div className="table-card">
                <h2>Transfers</h2>

                {Object.entries(data.transfers.byStatus).map(
                  ([status, count]) => (
                    <div className="status-row" key={status}>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                  )
                )}
              </div>

              <div className="table-card">
                <h2>Stock Movements</h2>

                <div className="status-row">
                  <span>Stock In</span>
                  <strong>{data.stockMovements.totalStockIn}</strong>
                </div>

                <div className="status-row">
                  <span>Stock Out</span>
                  <strong>{data.stockMovements.totalStockOut}</strong>
                </div>
              </div>
            </section>

            <section className="table-card">
              <h2>Inventory Overview</h2>

              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Physical</th>
                    <th>Reserved</th>
                    <th>Available</th>
                    <th>Minimum</th>
                  </tr>
                </thead>

                <tbody>
                  {data.inventory.products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                      </td>
                      <td>{product.sku}</td>
                      <td>{product.physicalStock}</td>
                      <td>{product.reservedStock}</td>
                      <td>{product.availableStock}</td>
                      <td>{product.minimumStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
