import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const menuItems = [
  { label: "Dashboard", path: "/dashboard", icon: "▦" },
  { label: "Operations", path: "/operations", icon: "⚙" },
  { label: "Customers", path: "/customers", icon: "♙" },
  { label: "Products", path: "/products", icon: "▤" },
  { label: "Inventory", path: "/inventory", icon: "◈" },
  { label: "Challans", path: "/challans", icon: "▣" },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">F</div>
        <div>
          <h2>Fundsroom</h2>
          <span>ERP CRM</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="logout-button" onClick={logout}>
          <span>↪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
