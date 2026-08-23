# Fundsroom ERP CRM

A full-stack Operations ERP and CRM application for managing customers, products, inventory, work orders, internal transfers, customer orders, challans, and stock reservation workflows.

The application implements role-based access control and operational business logic with a TypeScript/Express backend, React frontend, Prisma ORM, and PostgreSQL.

## Live Demo

Frontend:
https://fundsroom-frontend-ufqe.onrender.com

Backend:
https://fundsroom-erp-crm-xnyf.onrender.com

GitHub Repository:
https://github.com/Durga4896/fundsroom-erp-crm

## Features

### Authentication & Authorization

- Secure user login
- JWT-based authentication
- Password hashing with bcrypt
- Backend role-based authorization
- Supported roles:
  - ADMIN
  - OPERATIONS
  - SALES
- Protected API routes
- Admin-only user lookup for work-order assignment

### Inventory Management

- Location-based inventory
- Product, category, location, and batch tracking
- Physical quantity
- Reserved quantity
- Available stock calculated as `physicalQuantity - reservedQuantity`
- Inventory movements
- Prevention of invalid stock operations
- Duplicate inventory batch prevention

### Work Orders

- Admin-created work orders
- Assigned user tracking
- Status flow: `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`
- Required quantity tracking
- Available inventory and shortage calculation

### Internal Transfers

- Transfer request, dispatch, and receipt workflow
- Status flow: `REQUESTED`, `DISPATCHED`, `RECEIVED`
- Source inventory reduces on dispatch
- Destination inventory increases only on receipt
- Duplicate receipt prevention

### Customer Orders

- Sales order creation
- Multi-item customer orders
- Stock reservation at selected location
- Reservation beyond available inventory is blocked
- Order cancellation releases reserved stock
- Order completion consumes reserved stock

### Challans

- Challan management
- Draft, confirmed, and cancelled states
- Stock validation on confirmation
- Operational documentation workflow

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Axios
- CSS

### Backend

- Node.js
- Express
- TypeScript
- JWT
- bcrypt
- Zod
- Prisma ORM

### Database

- PostgreSQL
- Supabase compatible

### Testing

- Jest
- Supertest
- ts-jest

### Deployment

- Render for backend/frontend deployment
- PostgreSQL hosted on Supabase or another managed Postgres provider

## Project Structure

```text
fundsroom-erp-crm/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── tests/
│   │   ├── utils/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── Fundsroom-ERP-CRM.postman_collection.json
└── README.md
```

## Environment Variables

Create `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="replace-with-a-strong-secret"
CLIENT_URL="http://localhost:5173"
PORT=5001

ADMIN_PASSWORD="Admin1234"
OPERATIONS_PASSWORD="Operations1234"
SALES_PASSWORD="Sales1234"
```

Create `frontend/.env` if the backend URL is different from the default:

```env
VITE_API_URL="http://localhost:5001/api"
```

Do not commit `.env` files or production secrets.

## Database Setup

From `backend/`:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

For production/staging deployments, use:

```bash
npm run prisma:deploy
npm run seed
```

The seed creates the three required users:

- `admin@fundsroom.com`
- `operations@fundsroom.com`
- `sales@fundsroom.com`

Passwords are read from the matching environment variables.

## How to Run Locally

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend at `http://localhost:5173`.

Production-style local backend check:

```bash
cd backend
npm run build
npm start
```

## How to Test

The backend tests are integration tests against `http://localhost:5001`.

Terminal 1:

```bash
cd backend
npm run build
npm start
```

Terminal 2:

```bash
cd backend
npm test
```

Mandatory case-study tests covered:

- Cannot reserve more than available inventory.
- Cannot transfer more than available inventory.
- Destination stock increases only after transfer receipt.
- Same transfer cannot be received twice.
- Unauthorized user cannot perform a restricted operation.

## Database Schema / ER Diagram

Source schema: `backend/prisma/schema.prisma`

```mermaid
erDiagram
  User ||--o{ Customer : creates
  User ||--o{ WorkOrder : creates
  User ||--o{ WorkOrder : assigned
  User ||--o{ Transfer : creates
  User ||--o{ CustomerOrder : creates
  User ||--o{ StockMovement : creates

  Customer ||--o{ CustomerOrder : places
  Customer ||--o{ Challan : has
  Customer ||--o{ FollowUp : has

  Product ||--o{ Inventory : stocked_as
  Product ||--o{ WorkOrder : required_for
  Product ||--o{ Transfer : moved_by
  Product ||--o{ CustomerOrderItem : ordered_as
  Product ||--o{ StockMovement : tracked_by

  Location ||--o{ Inventory : stores
  Location ||--o{ WorkOrder : belongs_to
  Location ||--o{ Transfer : source
  Location ||--o{ Transfer : destination
  Location ||--o{ CustomerOrder : reserves_from

  CustomerOrder ||--o{ CustomerOrderItem : contains
  Challan ||--o{ ChallanItem : contains
```

Important constraints:

- `Inventory` is unique by `productId + locationId + batchNumber`.
- Available stock is calculated as `physicalQuantity - reservedQuantity`.
- Customer reservation, transfer dispatch, and inventory adjustment use database transactions with row-level locks before stock mutation.
- Transfer receipt creates a destination transfer batch and prevents receiving the same transfer twice.

## API Documentation

Postman collection:
`Fundsroom-ERP-CRM.postman_collection.json`

Main endpoints:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/inventory`
- `POST /api/inventory`
- `PATCH /api/inventory/:id/adjust`
- `GET /api/operations/work-orders`
- `POST /api/operations/work-orders`
- `PATCH /api/operations/work-orders/:id/status`
- `GET /api/operations/transfers`
- `POST /api/operations/transfers`
- `PATCH /api/operations/transfers/:id/status`
- `GET /api/operations/customer-orders`
- `POST /api/operations/customer-orders`
- `PATCH /api/operations/customer-orders/:id/status`

Role rules:

- Admin can create work orders and manage operational data.
- Operations users can manage inventory and transfers.
- Sales users can create customer orders and reserve stock.

## Demo Flow

For the 5-7 minute demo video, show:

1. Login as Admin, Operations, or Sales.
2. Inventory list with physical, reserved, and available stock.
3. Admin creates a work order and shortage is calculated.
4. Operations creates, dispatches, and receives an internal transfer.
5. Sales creates a customer order and stock is reserved.

## Deployment Notes

The frontend and backend can be deployed separately.

Backend environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_URL`
- `PORT`
- `ADMIN_PASSWORD`
- `OPERATIONS_PASSWORD`
- `SALES_PASSWORD`

Frontend environment variable:

- `VITE_API_URL`

Provide evaluator credentials separately rather than storing production passwords in this repository.

## Project Status

Production deployment completed successfully.
