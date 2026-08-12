# Fundsroom ERP & CRM

Full-stack ERP and CRM application developed for the Fundsroom technical case study.

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
- TypeScript
- Express
- JWT authentication
- Zod validation

### Database
- PostgreSQL
- Prisma ORM

## Features

### Authentication & Authorization
- JWT authentication
- Role-based access control
- ADMIN
- SALES
- WAREHOUSE
- ACCOUNTS

### Customer Management
- Create customers
- Search customers
- View customer details
- Edit customers
- Customer status
- Follow-up dates
- Follow-up notes
- Customer challan history
- GST and business information

### Product Management
- Create products
- Search products
- View products
- Edit products
- SKU and category management
- Pricing
- Minimum stock levels
- Warehouse location

### Inventory
- Stock IN
- Stock OUT
- Stock movement history
- Movement reason
- Created-by information
- Timestamp tracking
- Low-stock detection
- Negative-stock protection

### Challans
- Create challans
- Multiple challan items
- Draft, Confirmed and Cancelled states
- Automatic challan numbering
- Challan details
- Stock validation
- Stock reduction on confirmation
- Insufficient-stock protection

### Dashboard
- Customer overview
- Product overview
- Challan overview
- Low-stock alerts
- Recent customers
- Recent challans

## Project Structure

```text
fundsroom-erp-crm/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── utils/
│       ├── validators/
│       └── server.ts
│
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       └── pages/
│
└── README.md
