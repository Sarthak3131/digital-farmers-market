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

## 🗺️ Project Execution Roadmap

- [x] **Phase 0: Workspace Setup, Git Repository Initialization & Hygiene**
- [ ] **Phase 1: Database Schema Modernization & Seed Data Engine**
- [ ] **Phase 2: Security, Authentication & Role-Based Access Control (RBAC)**
- [ ] **Phase 3: Dynamic Product Catalog & Farmer Inventory Management**
- [ ] **Phase 4: Real-Time Auction & Live Bidding Engine**
- [ ] **Phase 5: Secure Order Processing, Cart & Financial Calculations**
- [ ] **Phase 6: Admin Command Center, Revenue Analytics & Governance**
- [ ] **Phase 7: Codebase Hygiene, UX Polish & Global Error Handling**
- [ ] **Phase 8: Production Readiness, Containerization & Cloud Deployment**

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
