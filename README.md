# ParcelRelay Backend

Courier and Logistics Management Platform built with Node.js, TypeScript,
Express, PostgreSQL, and Prisma.

## Project Information

Project Name: ParcelRelay

Backend Repository:
https://github.com/mahmudulhaque13/parcel-relay-backend

Live API:
https://parcel-relay-backend.vercel.app

API Documentation:
https://documenter.getpostman.com/view/54934207/2sBYB2s7sn

## Tech Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Prisma
- Zod
- JWT
- Google Authentication
- Stripe

## User Roles

- CUSTOMER
- COURIER
- ADMIN

## Main Features

- Authentication and authorization
- Google social login
- Shipment management
- Shipment tracking
- Pricing
- Pickup scheduling
- Courier assignment
- Hub transfer
- Payment processing
- Failed delivery and return-to-sender
- Admin management
- Audit logs
- Reports
- Pagination, filtering, sorting and search
- Soft delete
- Validation and centralized error handling

## API Response Format

### Success

{
"success": true,
"message": "Operation successful",
"data": {}
}

### Error

{
"success": false,
"message": "Something went wrong",
"errors": []
}

## API Version

/api/v1
