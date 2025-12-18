# TicketBari - Online Ticket Booking Platform (Backend API)

RESTful API backend for TicketBari, a comprehensive online ticket booking platform supporting multiple transport types with role-based authentication and Stripe payment integration.

## 🌐 Live API

- **Base URL**: [https://ticket-bari-server-psi.vercel.app/]
- **Frontend**: [https://ticket-bari-client.web.app/]

## 📋 Project Purpose

This backend API provides a secure, scalable foundation for the TicketBari ticket booking platform. It handles user authentication, ticket management, booking workflows, payment processing, and role-based access control across User, Vendor, and Admin roles.

## ✨ Key Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Firebase UID integration
- Role-based access control (User, Vendor, Admin)
- Password hashing with bcryptjs
- Protected API routes

### 🎫 Ticket Management
- CRUD operations for tickets
- Admin approval workflow
- Advertisement system (max 6 tickets)
- Search, filter, and sort capabilities
- Pagination support
- Real-time availability tracking

### 📋 Booking System
- Create booking requests
- Vendor acceptance/rejection
- Status tracking (Pending → Accepted → Rejected → Paid)
- Ticket snapshot preservation
- Expiry validation

### 💳 Payment Processing
- Stripe payment integration
- Payment intent creation
- Payment confirmation
- Transaction history
- Automatic ticket quantity reduction

### 👥 User Management
- User registration and login
- Role promotion (User → Vendor/Admin)
- Fraud detection and flagging
- User statistics
- Profile management

### 📊 Analytics & Reporting
- Vendor revenue tracking
- Tickets sold statistics
- User analytics
- Transaction history

## 🛠️ Technologies Used

### Core
- **Node.js** - Runtime environment
- **Express.js** (v4.21.2) - Web framework
- **MongoDB** - Database
- **Mongoose** (v8.9.3) - ODM

### Authentication & Security
- **bcryptjs** (v2.4.3) - Password hashing
- **jsonwebtoken** (v9.0.2) - JWT tokens
- **cors** (v2.8.5) - Cross-origin resource sharing
- **cookie-parser** (v1.4.7) - Cookie parsing

### Payment
- **Stripe** (v17.5.0) - Payment processing

### Development
- **dotenv** (v16.4.7) - Environment variables
- **nodemon** (v3.1.11) - Development server

## 📦 NPM Packages
```json
{
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "firebase-admin": "^13.6.0",
    "jsonwebtoken": "^9.0.3",
    "mongodb": "^7.0.0",
    "mongoose": "^9.0.1",
    "stripe": "^20.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.11"
  }
}
```









