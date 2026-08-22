import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Products from "./pages/Products";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Challans from "./pages/Challans";
import OperationsDashboard from "./pages/OperationsDashboard";
import CustomerOrders from "./pages/CustomerOrders";
import WorkOrders from "./pages/WorkOrders";
import Transfers from "./pages/Transfers";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Operations Dashboard */}
      <Route
        path="/operations"
        element={
          <ProtectedRoute>
            <OperationsDashboard />
          </ProtectedRoute>
        }
      />

      {/* Customer Orders */}
      <Route
        path="/customer-orders"
        element={
          <ProtectedRoute>
            <CustomerOrders />
          </ProtectedRoute>
        }
      />

      {/* Work Orders */}
      <Route
        path="/work-orders"
        element={
          <ProtectedRoute>
            <WorkOrders />
          </ProtectedRoute>
        }
      />

      {/* Transfers */}
      <Route
        path="/transfers"
        element={
          <ProtectedRoute>
            <Transfers />
          </ProtectedRoute>
        }
      />

      {/* Customers */}
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        }
      />

      {/* Products */}
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        }
      />

      {/* Inventory */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />

      {/* Challans */}
      <Route
        path="/challans"
        element={
          <ProtectedRoute>
            <Challans />
          </ProtectedRoute>
        }
      />

      {/* Default */}
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />

      {/* Unknown routes */}
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}