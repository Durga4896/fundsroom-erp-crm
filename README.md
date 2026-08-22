# Fundsroom ERP CRM

A full-stack ERP and CRM application for managing customers, products, inventory, customer orders, work orders, challans, and warehouse transfers.

The application implements role-based access control and operational workflows with a TypeScript/Express backend and React frontend.

---

## 🚀 Features

### Authentication & Authorization
- Secure user login
- JWT-based authentication
- Password hashing with bcrypt
- Role-based authorization
- Supported roles:
  - ADMIN
  - OPERATIONS
  - SALES
- Protected API routes
- Admin-only user lookup for work-order assignment

### Customer Management
- Create and manage customers
- Customer information management
- Customer order association

### Product Management
- Product catalog
- Product information management
- Product/SKU tracking

### Inventory Management
- Location-based inventory
- Available stock tracking
- Reserved stock tracking
- Inventory movements
- Stock validation
- Prevention of invalid stock operations

### Customer Orders
- Create customer orders
- Add products and quantities
- Reserve inventory for orders
- Order status management
- Inventory release on cancellation
- Inventory consumption on completion

### Work Orders
- Create work orders
- Assign work orders to users
- Track required quantities
- Track inventory availability and shortages
- Work-order status management
- Operational workflow support

### Warehouse Transfers
- Create inventory transfers between locations
- Dispatch transfers
- Receive transfers
- Destination inventory increases only after receiving
- Protection against duplicate receiving

### Challans
- Challan management
- Operational documentation workflow

---

## 🏗️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- React Router
- CSS

### Backend
- Node.js
- Express
- TypeScript
- JWT
- bcrypt
- Zod

### Database
- PostgreSQL
- Prisma ORM

### Testing
- Jest
- Supertest
- ts-jest

### Development Tools
- Git
- GitHub
- npm

---

## 📁 Project Structure

```text
fundsroom-erp-crm/
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── tests/
│   │   ├── utils/
│   │   └── server.ts
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── App.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
