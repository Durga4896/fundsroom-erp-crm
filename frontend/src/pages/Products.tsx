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

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    unitPrice: "",
    currentStock: "0",
    minimumStock: "0",
    warehouseLocation: "",
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products", {
        params: {
          search: search || undefined,
          page: 1,
          limit: 10,
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

  useEffect(() => {
    loadProducts();
  }, [search]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
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

      await api.post("/products", {
        name: form.name,
        sku: form.sku,
        category: form.category,
        unitPrice: Number(form.unitPrice),
        currentStock: Number(form.currentStock),
        minimumStock: Number(form.minimumStock),
        warehouseLocation: form.warehouseLocation,
      });

      setForm({
        name: "",
        sku: "",
        category: "",
        unitPrice: "",
        currentStock: "0",
        minimumStock: "0",
        warehouseLocation: "",
      });

      setShowForm(false);
      await loadProducts();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to create product"
      );
    }
  };

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage products, pricing and inventory levels.</p>
        </div>

        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close" : "+ Add Product"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="customer-form-card">
          <h2>Add Product</h2>

          <form onSubmit={handleSubmit} className="customer-form">
            <input
              name="name"
              placeholder="Product Name *"
              value={form.name}
              onChange={handleChange}
              required
            />

            <input
              name="sku"
              placeholder="SKU *"
              value={form.sku}
              onChange={handleChange}
              required
            />

            <input
              name="category"
              placeholder="Category *"
              value={form.category}
              onChange={handleChange}
              required
            />

            <input
              name="unitPrice"
              type="number"
              min="0"
              placeholder="Unit Price *"
              value={form.unitPrice}
              onChange={handleChange}
              required
            />

            <input
              name="currentStock"
              type="number"
              min="0"
              placeholder="Current Stock"
              value={form.currentStock}
              onChange={handleChange}
            />

            <input
              name="minimumStock"
              type="number"
              min="0"
              placeholder="Minimum Stock"
              value={form.minimumStock}
              onChange={handleChange}
            />

            <input
              name="warehouseLocation"
              placeholder="Warehouse Location"
              value={form.warehouseLocation}
              onChange={handleChange}
            />

            <button type="submit">
              Create Product
            </button>
          </form>
        </div>
      )}

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card">
        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Minimum</th>
                <th>Warehouse</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
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
                    ₹{Number(product.unitPrice).toLocaleString()}
                  </td>

                  <td>
                    <strong>{product.currentStock}</strong>
                  </td>

                  <td>{product.minimumStock}</td>

                  <td>
                    {product.warehouseLocation || "-"}
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
