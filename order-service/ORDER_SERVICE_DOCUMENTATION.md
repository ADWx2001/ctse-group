# Order Service Documentation

## 1. Overview
`order-service` is the microservice responsible for food order placement, order tracking, status updates, and notification orchestration in the Food Ordering System.

It is built with:
- Node.js 18
- Express
- MongoDB (via Mongoose)
- JWT auth
- Joi validation
- Docker
- Jest tests
- GitHub Actions CI/CD
- SonarCloud analysis

The service exposes REST endpoints on `http://localhost:3003` and communicates with:
- `user-service` for JWT validation and user identity
- `restaurant-service` for restaurant and menu data
- `notification-service` for sending order emails/notifications

### How it works
When a customer clicks "place order" in the frontend, the frontend sends the full order payload plus the user's JWT token to `order-service`. The order-service then validates the token, checks the menu and restaurant information with the restaurant-service, stores the order in MongoDB, and triggers the notification-service to send a confirmation email.

---

## 2. Core Files and Responsibilities

### Main entrypoint
- `src/server.js`
  - loads environment variables from `.env`
  - opens a MongoDB connection via `src/config/db.js`
  - starts the Express server

#### Process
1. Node starts `src/server.js`
2. `dotenv` loads config values
3. `connectDB()` opens MongoDB
4. `app.listen()` starts HTTP server on port 3003

### Express app
- `src/app.js`
  - adds security middleware
  - parses JSON request bodies
  - routes incoming requests
  - exposes health and Swagger endpoints
  - handles unknown routes and errors

#### Process
1. request enters Express
2. middleware validates request format and rate limits
3. route handlers are selected by path
4. any errors pass to the centralized error handler

### Routes
- `src/routes/orders.js`
  - applies auth middleware to all order routes
  - forwards requests to controller functions

#### Process
1. request to `/api/orders` arrives
2. `protect` verifies JWT and adds `req.user`
3. matching controller is executed

### Controller
- `src/controllers/orderController.js`
  - validates incoming requests with Joi
  - calls the restaurant-service for restaurant and menu item data
  - calculates totals
  - saves orders in MongoDB
  - triggers notification-service calls
  - manages order retrieval, cancellation, and status updates

#### Process for order creation
1. validate request payload
2. request restaurant details from restaurant-service
3. request each menu item details from restaurant-service
4. confirm availability and calculate subtotal
5. create MongoDB order document with `pending` status
6. send notification event to notification-service asynchronously
7. return 201 response to client

### Model
- `src/models/Order.js`
  - defines the MongoDB document structure
  - stores customer, delivery, restaurant, item, and status data
  - appends status history automatically when status changes

#### Process
1. controller builds the order object
2. Mongoose validates fields and types
3. `.save()` writes the document to MongoDB
4. pre-save hook adds the current status to `statusHistory`

### Authentication middleware
- `src/middleware/auth.js`
  - reads `Authorization: Bearer <token>` header
  - verifies JWT with shared `JWT_SECRET`
  - optionally calls user-service to confirm the token and refresh user data

#### Process
1. request arrives at protected route
2. middleware extracts JWT and verifies it locally
3. if local validation succeeds, `req.user` is populated
4. it may still call user-service to confirm the token
5. if verification fails, request returns 401

### External service clients
- `src/services/userService.js`
  - calls `GET /api/auth/validate` on user-service
  - returns user details if the token is valid

- `src/services/restaurantService.js`
  - calls `GET /api/restaurants/{restaurantId}` to validate restaurant
  - calls `GET /api/menu/{menuItemId}` to validate menu items
  - ensures current price and availability

- `src/services/notificationService.js`
  - posts notification payloads to the notification-service
  - sends order confirmation and status update events
  - logs failures but keeps the order flow successful

#### Process
1. order-service sends notification request
2. notification-service stores the notification
3. notification-service attempts to send an email
4. notification result is saved and returned

### Validation
- `src/validators/orderValidators.js`
  - request validation with Joi for
    - order creation
    - order status updates

#### Process
1. controller passes request body to validator
2. validator checks required fields and types
3. invalid requests are rejected with `400`

### Error handling
- `src/middleware/errorHandler.js`
  - standardized error response
  - handles validation, duplicate keys, and invalid IDs
  - returns stack trace only in development

#### Process
1. any controller throws an error
2. Express forwards it to `errorHandler`
3. `errorHandler` maps error type to status code
4. formatted JSON error is returned

### Testing
- `tests/order.test.js`
  - uses Jest, Supertest, MongoMemoryServer
  - mocks external service calls
  - tests order creation, auth, listing, and health

#### Process
1. tests create an in-memory MongoDB instance
2. external clients are mocked so tests run offline
3. requests are sent through the Express app
4. responses and database state are asserted

---

## 3. Request flow in the Order Service

### Order creation flow
1. Frontend sends `POST /api/orders` with user JWT and order payload.
2. `protect` middleware verifies the JWT and reads `req.user`.
3. `orderController.createOrder()` validates the payload with Joi.
4. The controller requests restaurant details from restaurant-service.
5. The controller requests each ordered menu item from restaurant-service.
6. It validates item availability and calculates each subtotal.
7. It computes `totalAmount` for the complete order.
8. It creates and saves an order document in MongoDB with `status: pending`.
9. It calls notification-service asynchronously to send confirmation.
10. It returns `201 Created` with the saved order.

### Status update flow
1. Frontend or admin calls `PUT /api/orders/:id/status`.
2. Controller validates the requested status change.
3. It loads the order from MongoDB.
4. It updates the order status and saves it.
5. Mongoose adds a new entry in `statusHistory`.
6. It sends an order status notification to notification-service.
7. It returns `200 OK` with updated order data.

### Order retrieval flow
1. Client calls `GET /api/orders` or `GET /api/orders/:id`.
2. `protect` middleware verifies JWT.
3. The controller builds a filter based on user role.
4. It queries MongoDB and returns matching orders.

### Order cancellation flow
1. Client calls `DELETE /api/orders/:id`.
2. Controller fetches the order from MongoDB.
3. It verifies the order can still be cancelled.
4. It updates status to `cancelled` and saves.
5. It sends cancellation notification if implemented.

---

## 4. Service dependencies and connections

### Order Service depends on:
- `mongo` container for order storage
- `user-service` at `http://user-service:3001` for auth identity
- `restaurant-service` at `http://restaurant-service:3002` for menu data
- `notification-service` at `http://notification-service:3004` for emails

### Docker Compose network
- all services share `food-ordering-network`
- service names act as DNS hostnames inside Docker

#### Process
1. Docker Compose creates the network.
2. Each service gets a hostname like `order-service`.
3. order-service uses these hostnames to call other containers.

### Environment variables
Defined in `docker-compose.yml` for Order Service:
- `NODE_ENV=development`
- `PORT=3003`
- `MONGODB_URI=mongodb://mongo:27017/foodorder_orders`
- `JWT_SECRET=super-secret-jwt-key-change-in-production`
- `JWT_EXPIRES_IN=7d`
- `USER_SERVICE_URL=http://user-service:3001`
- `RESTAURANT_SERVICE_URL=http://restaurant-service:3002`
- `NOTIFICATION_SERVICE_URL=http://notification-service:3004`

Local example values in `.env.example`:
- `MONGODB_URI=mongodb://localhost:27017/foodorder_orders`
- service URLs pointing to localhost ports

#### Process
1. Docker Compose injects environment variables into the container.
2. order-service reads them with `process.env`.
3. service URLs determine the endpoints it calls for external dependencies.

---

## 5. Docker setup for Order Service

### Dockerfile
- base image: `node:18-alpine`
- sets working dir `/app`
- creates non-root user `appuser`
- installs production dependencies with `npm ci --only=production`
- copies source files and `openapi.yaml`
- exposes port `3003`
- adds a healthcheck against `/health`
- starts with `node src/server.js`

#### Process
1. Docker reads `Dockerfile` while building the image.
2. it installs dependencies and copies app code.
3. it configures the container network and permissions.
4. on runtime, Docker starts the app process.

### Docker Compose configuration
From `docker-compose.yml`:
- Order Service build context: `./order-service`
- container name: `food-ordering-order-service`
- publishes `3003:3003`
- depends on `mongo`, `user-service`, and `restaurant-service`
- uses health checks before starting dependent services

#### Process
1. `docker-compose up -d` builds images and creates containers.
2. Compose starts services in dependency order.
3. health checks ensure `mongo`, `user-service`, and `restaurant-service` are ready before `order-service` starts.

### Local runtime
- health endpoint: `GET /health`
- Swagger docs: `GET /api-docs`
- API host: `http://localhost:3003`

---

## 6. API endpoints

### Health
- `GET /health`

#### Process
1. request hits Express route in `src/app.js`
2. service returns JSON indicating it is alive

### Place order
- `POST /api/orders`
- requires Bearer JWT
- body example:
```json
{
  "restaurantId": "rest-123",
  "items": [{ "menuItemId": "menu-item-1", "quantity": 2 }],
  "deliveryAddress": { "street": "123 Test St", "city": "Colombo" },
  "specialInstructions": "Leave at the door"
}
```

#### Process
1. frontend sends the order payload
2. order-service authenticates the user
3. it validates payload and calls restaurant-service
4. it creates the order and triggers notification-service

### List orders
- `GET /api/orders`
- returns orders for authenticated user
- supports `page`, `limit`, `status`, and owner/admin filtering

#### Process
1. auth middleware validates JWT
2. controller builds a query filter based on user role
3. MongoDB returns matching orders
4. response includes pagination data

### Get order by ID
- `GET /api/orders/{id}`

#### Process
1. auth verifies user identity
2. controller retrieves specified order
3. it checks access rights before returning the order

### Update order status
- `PUT /api/orders/{id}/status`
- request body:
```json
{ "status": "confirmed" }
```

#### Process
1. auth verifies the caller
2. controller validates the new status transition
3. it updates the order in MongoDB
4. it notifies notification-service of the status change

### Cancel order
- `DELETE /api/orders/{id}`

#### Process
1. auth verifies caller
2. controller loads the order and checks cancel rules
3. it updates `status` to `cancelled`
4. it returns the updated order

---

## 7. Testing and quality

### Test scripts
- `npm test`
- `npm run test:ci`

#### Process
1. tests start using Jest
2. MongoMemoryServer creates an in-memory DB
3. mocked service clients replace external calls
4. API requests run against the Express app
5. results and database state are asserted

### Test configuration
- Jest environment: `node`
- coverage saved to `coverage/`
- coverage source includes `src/**/*.js`, excludes `src/server.js`
- test timeout: 30 seconds

### Current tests
- order creation success
- order creation requires authentication
- validation failure for invalid order payloads
- get orders list
- health check

---

## 8. Sonar configuration

`sonar-project.properties` contains:
- `sonar.projectKey=food-ordering-order-service`
- `sonar.projectName=Food Ordering - Order Service`
- `sonar.projectVersion=1.0.0`
- `sonar.sources=src`
- `sonar.tests=tests`
- `sonar.language=js`
- `sonar.javascript.lcov.reportPaths=coverage/lcov.info`
- `sonar.exclusions=node_modules/**,coverage/**`

#### Process
1. CI runs tests and generates coverage data
2. Sonar uses `coverage/lcov.info` to measure coverage
3. Sonar analyzes source files and reports issues
4. results are posted to SonarCloud if configured

This config is used by SonarCloud to analyze:
- source files in `src/`
- test files in `tests/`
- code coverage data from Jest

---

## 9. CI/CD pipeline for Order Service

Workflow file: `.github/workflows/order-service.yml`

### Trigger conditions
- `push` to `master` or `main`
- PRs targeting `master` or `main`
- paths limited to `order-service/**` and the workflow file itself

### Jobs
1. **test**
   - checkout code
   - set up Node.js 18
   - install dependencies with `npm ci`
   - run `npm run test:ci`
   - upload coverage artifact

2. **security-scan**
   - runs Snyk vulnerability scan (non-blocking)

3. **sonarcloud**
   - downloads coverage artifact
   - runs SonarCloud scan
   - analyzes quality, bugs, vulnerabilities, test coverage

4. **build-and-push**
   - runs only on push to main/master
   - logs into Azure using stored secrets
   - logs into Azure Container Registry
   - builds Docker image with tags:
     - `${{ secrets.ACR_NAME }}.azurecr.io/food-ordering-order-service:${{ github.sha }}`
     - `${{ secrets.ACR_NAME }}.azurecr.io/food-ordering-order-service:latest`
   - pushes both tags

5. **deploy**
   - runs only on push to main/master after build-and-push
   - deploys the built image to Azure Container Apps

### Secrets used
- `AZURE_CREDENTIALS`
- `ACR_NAME`
- `GITHUB_TOKEN`
- `SONAR_TOKEN`

---

## 10. Local workflow and maintenance

### Start locally
```bash
docker-compose up -d
```

### Rebuild after backend change
```bash
docker-compose up --build -d order-service
```

### Stop and remove
```bash
docker-compose down
```

### Remove volumes when schema/data reset is needed
```bash
docker-compose down --volumes
```

### Check logs
```bash
docker-compose logs -f order-service
```

### Run tests locally
```bash
cd order-service
npm ci
npm run test:ci
```

---

## 11. Important notes

- The service uses `JWT_SECRET` to verify tokens locally.
- It also calls User Service for token validation and fresh user data.
- Notification sending is non-blocking: order placement still succeeds if email fails.
- The service depends on Docker Compose network service names inside containers.
- `openapi.yaml` provides API documentation and is served at `/api-docs` if Swagger is loaded.

---

## 12. Useful file map

- `src/server.js` — app startup
- `src/app.js` — Express app and middleware
- `src/routes/orders.js` — API routes
- `src/controllers/orderController.js` — order logic
- `src/models/Order.js` — MongoDB schema
- `src/config/db.js` — MongoDB connection
- `src/middleware/auth.js` — JWT auth
- `src/middleware/errorHandler.js` — error handling
- `src/services/userService.js` — User Service integration
- `src/services/restaurantService.js` — Restaurant Service integration
- `src/services/notificationService.js` — Notification Service integration
- `src/validators/orderValidators.js` — request validation
- `tests/order.test.js` — automated tests
- `Dockerfile` — container image build
- `openapi.yaml` — API spec
- `sonar-project.properties` — Sonar analysis config
- `.github/workflows/order-service.yml` — CI/CD pipeline
