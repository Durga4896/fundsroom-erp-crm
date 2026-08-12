import { useEffect, useState } from "react";
import api from "../api/axios";

type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  unitPrice: string | number;
  currentStock: number;
  minimumStock: number;
  warehouseLocation?: string;
};

type StockMovement = {
  id: number;
  productId: number;
  quantity: number;
  movementType: "IN" | "OUT";
  reason: string;
  createdAt: string;
  createdBy?: {
    name: string;
    email: string;
    role: string;
  };
};

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [movementLoading, setMovementLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

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
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async (productId: string) => {
    if (!productId) {
      setMovements([]);
      return;
    }

    try {
      const response = await api.get(
        `/products/${productId}/stock`
      );

      setMovements(response.data.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to load stock movements"
      );
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadMovements(selectedProduct);
  }, [selectedProduct]);

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      setError("Please select a product");
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    if (!reason.trim()) {
      setError("Please enter a reason");
      return;
    }

    try {
      setMovementLoading(true);
      setError("");
      setSuccess("");

      await api.post(
        `/products/${selectedProduct}/stock`,
        {
          quantity: Number(quantity),
          movementType,
          reason: reason.trim(),
        }
      );

      setQuantity("");
      setReason("");

      setSuccess(
        `Stock ${movementType === "IN" ? "added" : "removed"} successfully`
      );

      await loadProducts();
      await loadMovements(selectedProduct);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to update stock"
      );
    } finally {
      setMovementLoading(false);
    }
  };

  const getSelectedProduct = () => {
    return products.find(
      (product) => product.id === Number(selectedProduct)
    );
  };

  const selected = getSelectedProduct();

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>
            Manage stock levels and track inventory movements.
          </p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {success && (
        <div className="success">
          {success}
        </div>
      )}

      <div className="customer-form-card">
        <h2>Stock Movement</h2>

        <form
          onSubmit={handleMovement}
          className="customer-form"
        >
          <select
            value={selectedProduct}
            onChange={(e) => {
              setSelectedProduct(e.target.value);
              setError("");
              setSuccess("");
            }}
            required
          >
            <option value="">Select Product</option>

            {products.map((product) => (
              <option
                key={product.id}
                value={product.id}
              >
                {product.name} ({product.sku}) — Stock:{" "}
                {product.currentStock}
              </option>
            ))}
          </select>

          {selected && (
            <div className="inventory-info">
              <strong>{selected.name}</strong>
              <span>
                Current Stock:{" "}
                <strong>{selected.currentStock}</strong>
              </span>
              <span>
                Minimum Stock:{" "}
                <strong>{selected.minimumStock}</strong>
              </span>
            </div>
          )}

          <select
            value={movementType}
            onChange={(e) =>
              setMovementType(
                e.target.value as "IN" | "OUT"
              )
            }
          >
            <option value="IN">Stock IN</option>
            <option value="OUT">Stock OUT</option>
          </select>

          <input
            type="number"
            min="1"
            placeholder="Quantity *"
            value={quantity}
            onChange={(e) =>
              setQuantity(e.target.value)
            }
            required
          />

          <input
            type="text"
            placeholder="Reason *"
            value={reason}
            onChange={(e) =>
              setReason(e.target.value)
            }
            required
          />

          <button
            type="submit"
            disabled={movementLoading}
          >
            {movementLoading
              ? "Updating..."
              : movementType === "IN"
              ? "Add Stock"
              : "Remove Stock"}
          </button>
        </form>
      </div>

      <div className="table-card">
        <h2>Current Inventory</h2>

        {loading ? (
          <p>Loading inventory...</p>
        ) : products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Minimum</th>
                <th>Status</th>
                <th>Warehouse</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => {
                const lowStock =
                  product.currentStock <=
                  product.minimumStock;

                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>

                    <td>{product.sku}</td>

                    <td>
                      <span className="badge">
                        {product.category}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {product.currentStock}
                      </strong>
                    </td>

                    <td>
                      {product.minimumStock}
                    </td>

                    <td>
                      <span
                        className={
                          lowStock
                            ? "status-inactive"
                            : "status-active"
                        }
                      >
                        {lowStock
                          ? "LOW STOCK"
                          : "IN STOCK"}
                      </span>
                    </td>

                    <td>
                      {product.warehouseLocation ||
                        "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedProduct && (
        <div className="table-card">
          <h2>Stock Movement History</h2>

          {movements.length === 0 ? (
            <p>No stock movements found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                  <th>Created By</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      <span
                        className={
                          movement.movementType ===
                          "IN"
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {movement.movementType}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {movement.quantity}
                      </strong>
                    </td>

                    <td>{movement.reason}</td>

                    <td>
                      {movement.createdBy?.name ||
                        "-"}
                    </td>

                    <td>
                      {new Date(
                        movement.createdAt
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
