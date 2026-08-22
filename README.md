# Fundsroom ERP CRM

A full-stack ERP and CRM application designed to manage customers, products,
inventory, and sales challans with role-based authentication.

## Live Demo

Frontend:
https://fundsroom-frontend-ufqe.onrender.com

Backend:
https://fundsroom-erp-crm-xnyf.onrender.com

## Features

- User authentication
- JWT-based authorization
- Role-based access control
- Customer management
- Product management
- Inventory management
- Sales challan management
- Dashboard statistics
- PostgreSQL database
- REST API
- Responsive frontend

## User Roles

### Admin
Full access to the ERP/CRM system.

### Operations
Access to operational functionality such as inventory and challans.

### Sales
Access to sales/customer-related functionality.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- CSS

### Backend
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- JWT
- bcrypt

### Database
- PostgreSQL
- Supabase

### Deployment
- Render

## Architecture

User
↓
React Frontend
↓
REST API
↓
Express Backend
↓
Prisma ORM
↓
PostgreSQL / Supabase

## Local Setup

### Clone repository

git clone https://github.com/Durga4896/fundsroom-erp-crm.git

cd fundsroom-erp-crm

### Backend

cd backend

npm install

Create a `.env` file with the required environment variables.

Run:

npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run dev

### Frontend

cd frontend

npm install
npm run dev

## Environment Variables

The following environment variables are required:

- DATABASE_URL
- JWT_SECRET
- ADMIN_PASSWORD
- OPERATIONS_PASSWORD
- SALES_PASSWORD
- CLIENT_URL

Do not commit `.env` files or production secrets.

## Testing

Backend authentication and API functionality were tested locally and in
the deployed production environment.

Production login endpoint:

POST /api/auth/login

## Deployment

The frontend and backend are deployed separately on Render.

The backend connects to the PostgreSQL database hosted on Supabase.

## Demo Credentials

Provide evaluator credentials separately rather than storing production
passwords in this repository.

## Project Status

Production deployment completed successfully.
