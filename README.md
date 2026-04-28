# 🍔 Food Ordering System — Microservices Architecture

**SLIIT | SE4010 — Cloud Computing Assignment 2026**

A secure, containerized, cloud-deployed food ordering system built using microservices architecture with full DevOps and DevSecOps practices.

---

## Architecture Overview

```
                          ┌────────────────────────────────────────────────────────┐
                          │                   API Gateway / Client                  │
                          └──────────┬──────────────┬──────────────┬───────────────┘
                                     │              │              │
                          ┌──────────▼───┐  ┌───────▼──────┐  ┌──▼────────────────┐
                          │ User Service │  │  Restaurant  │  │   Order Service   │
                          │ Node.js:3001 │  │  Service     │  │   Node.js:3003    │
                          │ MongoDB      │  │  FastAPI:3002│  │   MongoDB         │
                          └──────────────┘  │  SQLite      │  └──────────┬────────┘
                                            └──────────────┘             │
                                                                         │
                                                               ┌─────────▼──────────┐
                                                               │ Notification Svc   │
                                                               │ FastAPI:3004        │
                                                               │ SQLite             │
                                                               └────────────────────┘
```

## Microservices

| Service                  | Tech Stack                         | Port | Student   | Responsibility                                         |
| ------------------------ | ---------------------------------- | ---- | --------- | ------------------------------------------------------ |
| **User Service**         | Node.js, Express, MongoDB          | 3001 | Student 1 | Authentication, JWT issuance, user profile management  |
| **Restaurant Service**   | Python, FastAPI, SQLite/PostgreSQL | 3002 | Student 2 | Restaurant listings, menu management                   |
| **Order Service**        | Node.js, Express, MongoDB          | 3003 | Student 3 | Order placement, tracking, inter-service orchestration |
| **Notification Service** | Python, FastAPI, SQLite            | 3004 | Student 4 | Email/push notifications for order events              |

## Inter-Service Communication

```
Order Service ──calls──► User Service       (validate JWT / get user details)
Order Service ──calls──► Restaurant Service (get menu item price/availability)
Order Service ──calls──► Notification Svc   (send order confirmation email)
Restaurant Svc ──calls──► User Service      (validate JWT for protected routes)
```

## Technology Stack

- **Languages**: Node.js (Express), Python (FastAPI)
- **Databases**: MongoDB Atlas (User + Order), SQLite (Restaurant + Notification)
- **Container Registry**: Docker Hub
- **Cloud Provider**: AWS (ECS Fargate + ECR)
- **CI/CD**: GitHub Actions
- **Security Scanning**: SonarCloud (SAST) + Snyk (dependency scanning)
- **Auth**: JWT (RS256 shared secret)
- **API Docs**: OpenAPI 3.0 / Swagger

---

## Quick Start (Local Development)

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### Run All Services Locally

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/food-ordering-system.git
cd food-ordering-system

# Copy environment files
cp user-service/.env.example user-service/.env
cp restaurant-service/.env.example restaurant-service/.env
cp order-service/.env.example order-service/.env
cp notification-service/.env.example notification-service/.env

# Start all services
docker-compose up --build
```

Services will be available at:

- User Service: http://localhost:3001
- Restaurant Service: http://localhost:3002
- Order Service: http://localhost:3003
- Notification Service: http://localhost:3004

### API Documentation

Each service exposes Swagger UI:

- http://localhost:3001/api-docs
- http://localhost:3002/docs
- http://localhost:3003/api-docs
- http://localhost:3004/docs

---

## Project Structure

```
food-ordering-system/
├── .github/
│   └── workflows/
│       ├── user-service.yml
│       ├── restaurant-service.yml
│       ├── order-service.yml
│       └── notification-service.yml
├── user-service/          # Node.js authentication service
├── restaurant-service/    # Python restaurant & menu service
├── order-service/         # Node.js order management service
├── notification-service/  # Python notification service
├── infrastructure/        # AWS ECS task definitions
├── docker-compose.yml     # Local development orchestration
└── README.md
```

---

## DevOps Practices Implemented

### CI/CD Pipeline (GitHub Actions)

Each microservice has its own GitHub Actions workflow that:

1. **Lint & Test** — Runs unit tests with coverage reporting
2. **SAST Scan** — SonarCloud static analysis
3. **Dependency Scan** — Snyk vulnerability check
4. **Docker Build** — Builds the container image
5. **Push to Registry** — Pushes to Docker Hub / AWS ECR
6. **Deploy** — Updates AWS ECS service with new image

### Security Measures (DevSecOps)

- JWT authentication with expiry on all protected routes
- bcrypt password hashing (salt rounds: 12)
- Helmet.js HTTP security headers
- Rate limiting on auth endpoints
- Input validation (Joi / Pydantic)
- Non-root Docker user
- Secrets managed via AWS Secrets Manager / GitHub Secrets
- SonarCloud SAST integration
- Snyk dependency vulnerability scanning
- Principle of least privilege (IAM roles)
- CORS configuration

### Cloud Deployment (AWS)

- **Container Registry**: AWS ECR (Elastic Container Registry)
- **Orchestration**: AWS ECS Fargate
- **Secrets**: AWS Secrets Manager
- **Logging**: AWS CloudWatch
- **Networking**: VPC with security groups

---

## API Endpoints Summary

### User Service (port 3001)

| Method | Path                | Auth     | Description             |
| ------ | ------------------- | -------- | ----------------------- |
| POST   | /api/auth/register  | No       | Register new user       |
| POST   | /api/auth/login     | No       | Login and get JWT       |
| GET    | /api/users/profile  | JWT      | Get own profile         |
| PUT    | /api/users/profile  | JWT      | Update profile          |
| GET    | /api/users/validate | Internal | Validate JWT (internal) |

### Restaurant Service (port 3002)

| Method | Path                       | Auth | Description            |
| ------ | -------------------------- | ---- | ---------------------- |
| GET    | /api/restaurants           | No   | List all restaurants   |
| GET    | /api/restaurants/{id}      | No   | Get restaurant details |
| POST   | /api/restaurants           | JWT  | Create restaurant      |
| GET    | /api/restaurants/{id}/menu | No   | Get menu               |
| POST   | /api/restaurants/{id}/menu | JWT  | Add menu item          |
| PUT    | /api/menu/{id}             | JWT  | Update menu item       |
| DELETE | /api/menu/{id}             | JWT  | Delete menu item       |

### Order Service (port 3003)

| Method | Path                   | Auth | Description         |
| ------ | ---------------------- | ---- | ------------------- |
| POST   | /api/orders            | JWT  | Place new order     |
| GET    | /api/orders            | JWT  | Get user's orders   |
| GET    | /api/orders/:id        | JWT  | Get order by ID     |
| PUT    | /api/orders/:id/status | JWT  | Update order status |
| DELETE | /api/orders/:id        | JWT  | Cancel order        |

### Notification Service (port 3004)

| Method | Path                             | Auth     | Description            |
| ------ | -------------------------------- | -------- | ---------------------- |
| POST   | /api/notifications/send          | Internal | Send notification      |
| GET    | /api/notifications/user/{userId} | JWT      | Get user notifications |
| PUT    | /api/notifications/{id}/read     | JWT      | Mark as read           |

---

## Environment Variables

See `.env.example` in each service directory for required configuration.

---

## Challenges & Solutions

See individual service READMEs for service-specific challenges.

**Integration challenges:**

- JWT secret must be shared across all services — managed via environment variables / AWS Secrets Manager
- Service discovery in ECS — handled using ECS Service Connect / environment variable URLs
- Database migrations — automated in CI/CD pipeline

---

## Team Members

| Student   | Microservice         | Role                |
| --------- | -------------------- | ------------------- |
| Student 1 | User Service         | Auth & Identity     |
| Student 2 | Restaurant Service   | Menu & Catalog      |
| Student 3 | Order Service        | Order Orchestration |
| Student 4 | Notification Service | Alerts & Comms      |

The Azure for Students subscription has a restriction — SLIIT controls the Azure AD tenant and students don't have permission to create app registrations (service principals). This is a common limitation.

Service URL
User https://food-ordering-user-svc.azurewebsites.net
Order https://food-ordering-order-svc.azurewebsites.net
Restaurant https://food-ordering-restaurant-svc.azurewebsites.net
Notification https://food-ordering-notification-svc.azurewebsites.net
Frontend https://food-ordering-frontend-svc.azurewebsites.net

az webapp deployment list-publishing-profiles --name food-ordering-user-svc --resource-group rg-food-ordering --xml

az webapp deployment list-publishing-profiles --name food-ordering-order-svc --resource-group rg-food-ordering --xml

az webapp deployment list-publishing-profiles --name food-ordering-restaurant-svc --resource-group rg-food-ordering --xml

az webapp deployment list-publishing-profiles --name food-ordering-notification-svc --resource-group rg-food-ordering --xml

az webapp deployment list-publishing-profiles --name food-ordering-frontend-svc --resource-group rg-food-ordering --xml
