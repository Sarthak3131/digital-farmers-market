# 🌱 TerraFresh — Digital Farmers Market Platform

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-green.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF.svg)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-black.svg)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248.svg)](https://www.mongodb.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101.svg)](https://socket.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A scalable, full-stack B2C & B2B agricultural commerce platform connecting farmers directly with consumers. TerraFresh eliminates predatory middlemen through direct e-commerce trade, competitive live auction bidding, real-time market price discovery, and transparent governance.

---

## 📸 System Overview

```
                        +----------------------------+
                        |   TerraFresh Web Client    |
                        | (React 19 + Vite + Tailwind)|
                        +--------------+-------------+
                                       |
                RESTful HTTP APIs      |      WebSocket (Socket.io)
                (Auth, Orders, Prods)  |      (Live Bidding, Tickers)
                                       v
                        +----------------------------+
                        |    Node.js / Express API   |
                        |      (JWT Auth + RBAC)     |
                        +--------------+-------------+
                                       |
                                       v
                        +----------------------------+
                        |       MongoDB Engine       |
                        |  (Users, Products, Orders, |
                        |     Auctions, Disputes)    |
                        +----------------------------+
```

---

## ✨ Key Features

### 🛒 Consumer Portal
- **Direct Farm Produce**: Browse verified categories (Vegetables, Fruits, Grains, Dairy, Organic, Seeds, Spices, Herbs).
- **Dynamic Search & Filtering**: Filter by category, price, organic grade, and freshness.
- **Cart & Secure Checkout**: Real-time price calculation, delivery slot selection, and invoice generation.
- **Live Bidding**: Participate in active farm auctions with real-time price updates.
- **Order Tracking**: Comprehensive order status tracking from farm harvest to doorstep delivery.

### 🚜 Farmer Portal
- **Inventory Management**: List produce with transparent grading, quantities, pricing, and harvest dates.
- **Auction Engine**: Create and manage scheduled or live auctions with custom reserve prices and bid increments.
- **Sales & Earnings Analytics**: Real-time revenue analytics and order fulfillment feeds.
- **Farmer KYC Verification**: Structured KYC document submission and verification tracking.
- **Farmer B2B Input Market**: Buy seeds, fertilizers, pesticides, and machinery directly on the platform.

### 🛡️ Admin Command Center
- **System Governance**: User management with active/suspend status controls.
- **KYC Verification Queue**: Review, validate, approve, or reject incoming farmer applications.
- **Auction Interventions**: Real-time auction monitor with emergency stop controls.
- **Financial Analytics**: 7-day revenue aggregation, gross merchandise volume (GMV), and commission tracking.
- **Dispute Resolution**: Arbitrate buyer-seller disputes and resolve transaction issues.
- **Dynamic System Config**: Toggle maintenance mode, registration, and platform fee percentage on the fly.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, React Router v7, Framer Motion 12, Lucide Icons, Recharts, jsPDF |
| **Backend** | Node.js, Express.js (ESM), Socket.io, JSON Web Tokens (JWT), BcryptJS, Mongoose 9 |
| **Database** | MongoDB (Local / Atlas) |
| **Realtime** | WebSocket via Socket.io for live bids, activity tickers, and admin alerts |
| **Geocoding & Weather** | Open-Meteo API & OpenStreetMap Nominatim for localized live weather and location |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) installed locally or a [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI

---

### Installation & Setup

#### 1. Clone Repository
```bash
git clone https://github.com/Sarthak3131/digital-farmers-market.git
cd digital-farmers-market
```

#### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT Secret
npm run dev
```
Backend will start on `http://localhost:5000`.

#### 3. Frontend Setup
```bash
cd ../frontent
npm install
cp .env.example .env
npm run dev
```
Frontend will be available at `http://localhost:5173`.

---

## 🔐 Environment Configuration

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/digital-farmers-market
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
PLATFORM_FEE=2.5
```

### Frontend (`frontent/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 👥 Demo Test Accounts

The database includes pre-configured accounts across all user roles:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@terrafresh.com` | `admin123` | Full access to command center, live monitor, verification |
| **Farmer (Verified)** | `rajesh@farm.com` | `password123` | Active farm profile, live listings, and earnings |
| **Farmer (Pending KYC)** | `suresh@farm.com` | `password123` | For testing Admin KYC approval/rejection workflows |
| **Consumer** | `consumer@terrafresh.com` | `password123` | Shopping cart, checkout, bidding, and order history |

To reset and re-seed the database at any time:
```bash
cd backend
npm run seed
```

---

## 🛡️ Security & Role-Based Access Control (RBAC)

The platform enforces strict multi-layered security controls across both backend and frontend:

- **Privilege Escalation Protection**: Public self-registration endpoints strictly disallow the `admin` role. All public signups are restricted to `consumer` or unverified `farmer`.
- **Claims-Bearing JWTs**: JWT payloads encode both the verified `id` and `role`. Tokens are verified on every protected request.
- **Account Suspension Enforcement**: Middleware checks `isActive` on every authenticated request, immediately cutting off deactivated users.
- **Standardized Client Storage**: Unified JWT token storage under the `token` key across all consumer, farmer, and admin portals.
- **React Route Guards**: All routes are guarded by `ProtectedRoute`, verifying authentication and ensuring strict role separation (`/admin/*`, `/farmer/*`, `/consumer/*`).

---

## 🌾 Dynamic Product Catalog & Farmer Inventory

- **Dynamic Multi-Category Catalog**: 9 consumer category catalogs (Vegetables, Fruits, Grains, Dairy, Organic, Seeds, Spices, Herbs, Exotic) fetch directly from `GET /api/products?category=<Category>` with instant search filtering, real-time stock indicators, and verified farmer badges.
- **Robust Cart & ObjectId Interoperability**: `CartContext` seamlessly preserves MongoDB `_id` identifiers for reliable order placement, eliminating orphaned numeric ID mismatches.
- **Farmer Inventory Center (`/farmer/products`)**: Dedicated inventory management interface enabling farmers to publish direct harvest produce, perform real-time stock adjustments (+/- stock), and monitor live auction lots.
- **Full Backend Product CRUD**: Complete REST API with category filtering, keyword search, price range queries, farmer authorization checks, and automatic stock status transitions (`available`, `low_stock`, `sold_out`).

---

## 🔨 Real-Time Auction & Live Bidding Engine

- **Socket.io Bidding Infrastructure**: Full duplex WebSocket communication via room subscriptions (`socket.join(auctionId)`), broadcasting instant price increases, highest bidder changes, bid counts, and time updates.
- **Anti-Fraud & Shill Bidding Guard**: Hard rejection (`400 Bad Request`) when a seller attempts to place bids on their own produce auction, ensuring fair market integrity.
- **Optimistic Concurrency & Expiry Automation**: High-throughput atomic state locks (`findOneAndUpdate` with active status checks) prevent race conditions and auto-close auctions upon expiration.
- **Live Consumer Arena & Dynamic Feed**: Real-time bidding interface with interactive quick-bid buttons, live activity ticker (`/api/auctions/feed`), dynamic countdown timers, and winner announcements.
- **Farmer Auction Management**: Comprehensive overview for farmers to launch lots with reserve prices and watch incoming live bids without manual refreshing.

---

## 📦 Secure Order Processing, Cart & Financial Calculations

- **Server-Side Financial Integrity**: All product prices, line items, and quantities are re-validated against database records. Client-side price tampering is completely nullified.
- **Accurate Financial Calculations**: Automated server calculations for produce subtotal, statutory GST (5%), platform governance fee (2.5%), and threshold-based free delivery (> ₹500).
- **Atomic Stock Management & Reversion**: Real-time inventory decrement upon checkout. If an order is cancelled by the buyer or refunded by the farmer/admin, inventory stock is automatically and atomically restored.
- **Human-Readable Tracking**: Generates unique tracking identifiers (`TF-ORD-XXXXXX-XXXX`) with full event lifecycle tracking (`pending` -> `processing` -> `shipped` -> `delivered`).
- **Farmer Produce Fulfillment (`/farmer/orders`)**: Dedicated portal for farmers to inspect incoming harvest orders, review customer delivery addresses, advance shipment stages, and track gross farm sales.
- **Interactive Consumer Order Hub & Invoicing**: Real-time status progression, detailed item breakdown modal, PDF invoice downloads via `jsPDF`, and one-click order cancellation with inventory restitution.

---

## 🗺️ Project Execution Roadmap

- [x] **Phase 0: Workspace Setup, Git Repository Initialization & Hygiene**
- [x] **Phase 1: Database Schema Modernization & Seed Data Engine**
- [x] **Phase 2: Security, Authentication & Role-Based Access Control (RBAC)**
- [x] **Phase 3: Dynamic Product Catalog & Farmer Inventory Management**
- [x] **Phase 4: Real-Time Auction & Live Bidding Engine**
- [x] **Phase 5: Secure Order Processing, Cart & Financial Calculations**
- [ ] **Phase 6: Admin Command Center, Revenue Analytics & Governance**
- [ ] **Phase 7: Codebase Hygiene, UX Polish & Global Error Handling**
- [ ] **Phase 8: Production Readiness, Containerization & Cloud Deployment**

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
