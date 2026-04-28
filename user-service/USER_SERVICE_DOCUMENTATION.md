# User Service Documentation

## 1. Overview
`user-service` is the microservice responsible for user authentication, registration, JWT token management, and profile operations in the Food Ordering System.

It is built with:
- Node.js 18
- Express
- MongoDB (via Mongoose)
- JWT auth with bcrypt password hashing
- Joi validation
- Docker
- Jest tests
- GitHub Actions CI/CD
- SonarCloud analysis

The service exposes REST endpoints on `http://localhost:3001` and provides authentication services to:
- Frontend for login/register
- Other microservices for JWT validation

### How it works
When a user registers or logs in through the frontend, the frontend sends credentials to user-service. The service validates the input, hashes passwords, generates JWT tokens, and stores user data in MongoDB. Other services can validate JWT tokens by calling user-service's internal endpoints.

---

## 2. Core Files and Responsibilities

### Main entrypoint
- `src/server.js`
  - loads environment variables
  - connects to MongoDB via `src/config/db.js`
  - starts Express app on port `process.env.PORT` or `3001`

#### Process
1. Node starts `src/server.js`
2. `dotenv` loads config values
3. `connectDB()` opens MongoDB
4. `app.listen()` starts HTTP server on port 3001

### Express app
- `src/app.js`
  - security middleware: `helmet`, `cors`, `express-rate-limit`
  - request parsing: `express.json`, `express.urlencoded`
  - logging with `morgan` (except in test mode)
  - health route at `/health`
  - Swagger docs at `/api-docs`
  - routes mounted at `/api/auth` and `/api/users`
  - error handlers: `notFound` and `errorHandler`

#### Process
1. request enters Express
2. middleware validates request format and rate limits (stricter on auth routes)
3. route handlers are selected by path
4. any errors pass to the centralized error handler

### Routes
- `src/routes/auth.js`
  - public endpoints for registration, login, and token validation
  - endpoints:
    - `POST /api/auth/register`
    - `POST /api/auth/login`
    - `GET /api/auth/validate`

- `src/routes/users.js`
  - protected endpoints for profile management
  - all routes use `protect` middleware
  - endpoints:
    - `GET /api/users/profile`
    - `PUT /api/users/profile`
    - `DELETE /api/users/profile`

#### Process
1. request to `/api/auth/register` arrives
2. no auth middleware, so controller is executed directly
3. request to `/api/users/profile` arrives
4. `protect` verifies JWT and adds `req.user`
5. controller executes with authenticated user context

### Controller
- `src/controllers/authController.js`
  - handles registration, login, and token validation
  - validates requests with Joi schemas in `src/validators/authValidators.js`
  - generates JWT tokens
  - hashes passwords and compares them
  - updates last login timestamps

- `src/controllers/userController.js`
  - manages profile retrieval, updates, and deactivation
  - prevents role escalation and password changes via profile update

#### Process for registration
1. validate request payload with Joi
2. check if email already exists in MongoDB
3. create user document with hashed password
4. generate JWT token
5. return token and user data

#### Process for login
1. validate request payload
2. find user by email and check if active
3. compare provided password with hashed password
4. update last login timestamp
5. generate JWT token
6. return token and user data

#### Process for token validation
1. extract JWT from Authorization header
2. verify JWT with shared secret
3. find user by ID and check if active
4. return user details if valid

### Model
- `src/models/User.js`
  - Mongoose schema for user storage
  - contains:
    - `name`, `email`, `password` (hashed)
    - `role` (customer/restaurant_owner/admin)
    - `phone`, `address`
    - `isActive`, `lastLogin`
  - pre-save hook to hash passwords automatically
  - methods for password comparison and JSON sanitization

#### Process
1. controller builds the user object
2. Mongoose validates fields and types
3. pre-save hook hashes the password if modified
4. `.save()` writes the document to MongoDB
5. `.toJSON()` removes sensitive fields from responses

### Authentication middleware
- `src/middleware/auth.js`
  - checks `Authorization: Bearer <token>` header
  - verifies JWT using `process.env.JWT_SECRET`
  - attaches decoded payload to `req.user`
  - `authorize` function checks user roles

#### Process
1. request arrives at protected route
2. middleware extracts JWT and verifies it locally
3. `req.user` is populated with decoded payload
4. if role authorization is required, it checks against allowed roles
5. if verification fails, request returns 401 or 403

### Validation
- `src/validators/authValidators.js`
  - request validation with Joi for
    - registration (name, email, password strength)
    - login (email, password)
    - profile updates

#### Process
1. controller passes request body to validator
2. validator checks required fields, types, and patterns
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
- `tests/auth.test.js`
  - uses Jest, Supertest, and MongoMemoryServer
  - mocks are not needed since it's standalone
  - tests registration, login, profile, and health

#### Process
1. tests start using Jest
2. MongoMemoryServer creates an in-memory DB
3. requests are sent through the Express app
4. responses and database state are asserted

---

## 3. Request flow in the User Service

### Registration flow
1. Frontend sends `POST /api/auth/register` with user details.
2. `authController.register()` validates the payload with Joi.
3. It checks if the email already exists in MongoDB.
4. It creates a new user document with hashed password.
5. It generates a JWT token for the new user.
6. It returns `201 Created` with token and user data.

### Login flow
1. Frontend sends `POST /api/auth/login` with email and password.
2. `authController.login()` validates the payload.
3. It finds the user by email and checks if active.
4. It compares the provided password with the stored hash.
5. It updates the user's `lastLogin` timestamp.
6. It generates a JWT token.
7. It returns `200 OK` with token and user data.

### Token validation flow (internal)
1. Other service sends `GET /api/auth/validate` with Bearer token.
2. `authController.validate()` extracts the token.
3. It verifies the JWT with the shared secret.
4. It fetches the user from MongoDB and checks if active.
5. It returns `200 OK` with user details if valid.

### Profile retrieval flow
1. Client sends `GET /api/users/profile` with JWT.
2. `protect` middleware verifies the token.
3. `userController.getProfile()` fetches user by ID.
4. It returns `200 OK` with user data.

### Profile update flow
1. Client sends `PUT /api/users/profile` with JWT and update data.
2. `protect` middleware verifies the token.
3. `userController.updateProfile()` validates the payload.
4. It prevents role and password changes.
5. It updates the user document in MongoDB.
6. It returns `200 OK` with updated user data.

### Account deactivation flow
1. Client sends `DELETE /api/users/profile` with JWT.
2. `protect` middleware verifies the token.
3. `userController.deleteProfile()` sets `isActive` to false.
4. It returns `200 OK` with deactivation message.

---

## 4. Service dependencies and connections

### User Service depends on:
- `mongo` container for user storage
- No other microservices directly (provides auth to others)

### Other services depend on User Service:
- `order-service` calls `/api/auth/validate` for JWT validation
- `restaurant-service` calls `/api/auth/validate` for JWT validation
- Frontend calls registration, login, and profile endpoints

### Docker Compose network
- all services share `food-ordering-network`
- service names act as DNS hostnames inside Docker

#### Process
1. Docker Compose creates the network.
2. Each service gets a hostname like `user-service`.
3. other services use `http://user-service:3001` to call this service.

### Environment variables
Defined in `docker-compose.yml` for User Service:
- `NODE_ENV=development`
- `PORT=3001`
- `MONGODB_URI=mongodb://mongo:27017/foodorder_users`
- `JWT_SECRET=super-secret-jwt-key-change-in-production`
- `JWT_EXPIRES_IN=7d`

Local example values in `.env.example`:
- `MONGODB_URI=mongodb://localhost:27017/foodorder_users`
- service URLs not needed since it's the auth provider

#### Process
1. Docker Compose injects environment variables into the container.
2. user-service reads them with `process.env`.
3. JWT secret is shared with other services for token verification.

---

## 5. Docker setup for User Service

### Dockerfile
- base image: `node:18-alpine`
- sets working dir `/app`
- creates non-root user `appuser`
- installs production dependencies with `npm ci --only=production`
- copies source files and `openapi.yaml`
- exposes port `3001`
- adds a healthcheck against `/health`
- starts with `node src/server.js`

#### Process
1. Docker reads `Dockerfile` while building the image.
2. it installs dependencies and copies app code.
3. it configures the container network and permissions.
4. on runtime, Docker starts the app process.

### Docker Compose configuration
From `docker-compose.yml`:
- User Service build context: `./user-service`
- container name: `food-ordering-user-service`
- publishes `3001:3001`
- depends on `mongo` container
- uses health checks before starting dependent services

#### Process
1. `docker-compose up -d` builds images and creates containers.
2. Compose starts services in dependency order.
3. health check ensures `mongo` is ready before `user-service` starts.

### Local runtime
- health endpoint: `GET /health`
- Swagger docs: `GET /api-docs`
- API host: `http://localhost:3001`

---

## 6. API endpoints

### Health
- `GET /health`

#### Process
1. request hits Express route in `src/app.js`
2. service returns JSON indicating it is alive

### Register user
- `POST /api/auth/register`
- public endpoint
- body example:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123",
  "phone": "+94771234567",
  "role": "customer"
}
```

#### Process
1. frontend sends user registration data
2. user-service validates input and checks email uniqueness
3. it hashes the password and saves the user
4. it generates a JWT token
5. it returns token and user data for immediate login

### Login user
- `POST /api/auth/login`
- public endpoint
- body example:
```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

#### Process
1. frontend sends login credentials
2. user-service finds user by email and verifies password
3. it updates last login timestamp
4. it generates a JWT token
5. it returns token and user data

### Validate token
- `GET /api/auth/validate`
- requires Bearer JWT
- used internally by other services

#### Process
1. other service sends request with JWT
2. user-service verifies the token
3. it fetches fresh user data from MongoDB
4. it returns validation result and user details

### Get profile
- `GET /api/users/profile`
- requires Bearer JWT

#### Process
1. authenticated user requests profile
2. user-service fetches user data by ID
3. it returns the complete user profile

### Update profile
- `PUT /api/users/profile`
- requires Bearer JWT
- body example:
```json
{
  "name": "John Smith",
  "phone": "+94771234567",
  "address": {
    "street": "123 Main St",
    "city": "Colombo"
  }
}
```

#### Process
1. authenticated user sends update data
2. user-service validates input and prevents sensitive changes
3. it updates the user document in MongoDB
4. it returns the updated user data

### Delete profile
- `DELETE /api/users/profile`
- requires Bearer JWT

#### Process
1. authenticated user requests account deletion
2. user-service sets `isActive` to false (soft delete)
3. it returns a deactivation confirmation

---

## 7. Testing and quality

### Test scripts
- `npm test`
- `npm run test:ci`

#### Process
1. tests start using Jest
2. MongoMemoryServer creates an in-memory DB
3. requests are sent through the Express app
4. responses and database state are asserted

### Test configuration
- Jest environment: `node`
- coverage saved to `coverage/`
- coverage source includes `src/**/*.js`, excludes `src/server.js`
- test timeout: 30 seconds

### Current tests
- user registration success and validation
- login with valid/invalid credentials
- profile retrieval and updates
- health check

---

## 8. Sonar configuration

`sonar-project.properties` contains:
- `sonar.projectKey=food-ordering-user-service`
- `sonar.projectName=Food Ordering - User Service`
- `sonar.projectVersion=1.0.0`
- `sonar.sources=src`
- `sonar.tests=tests`
- `sonar.language=js`
- `sonar.javascript.lcov.reportPaths=coverage/lcov.info`
- `sonar.testExecutionReportPaths=coverage/test-reporter.xml`
- `sonar.exclusions=node_modules/**,coverage/**`

#### Process
1. CI runs tests and generates coverage data
2. Sonar uses `coverage/lcov.info` to measure coverage
3. Sonar analyzes source files and reports issues
4. results are posted to SonarCloud if configured

---

## 9. CI/CD pipeline for User Service

Workflow file: `.github/workflows/user-service.yml`

### Trigger conditions
- `push` to `master` or `main`
- PRs targeting `master` or `main`
- paths limited to `user-service/**` and the workflow file itself

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
   - login to Azure using stored secrets
   - login to Azure Container Registry
   - build Docker image with tags:
     - `${{ secrets.ACR_NAME }}.azurecr.io/food-ordering-user-service:${{ github.sha }}`
     - `${{ secrets.ACR_NAME }}.azurecr.io/food-ordering-user-service:latest`
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

## 10. Important notes

- The service uses `bcryptjs` for password hashing with salt rounds 12.
- JWT tokens are verified locally by other services using the shared `JWT_SECRET`.
- User registration allows `customer` and `restaurant_owner` roles, but not `admin`.
- Profile updates cannot change `role` or `password` fields.
- Account deletion is soft delete (sets `isActive: false`).
- The service uses stricter rate limiting on auth endpoints (20 requests per 15 minutes).
- `lastLogin` timestamp is updated on successful login.

---

## 11. Useful file map

- `src/server.js` — app startup
- `src/app.js` — Express app and middleware
- `src/routes/auth.js` — public auth routes
- `src/routes/users.js` — protected user routes
- `src/controllers/authController.js` — auth logic (register, login, validate)
- `src/controllers/userController.js` — profile management
- `src/models/User.js` — MongoDB user schema
- `src/config/db.js` — MongoDB connection
- `src/middleware/auth.js` — JWT auth and authorization
- `src/middleware/errorHandler.js` — error handling
- `src/validators/authValidators.js` — request validation
- `tests/auth.test.js` — automated tests
- `Dockerfile` — container image build
- `openapi.yaml` — API spec
- `sonar-project.properties` — Sonar analysis config
- `.github/workflows/user-service.yml` — CI/CD pipeline

---

## 3. Integrations and Connected Features

- **Frontend**: Connects to user-service for registration, login, and profile management via REST API.
- **Order-service & Restaurant-service**: Rely on user-service for JWT validation and user identity. They call `/api/auth/validate` to verify tokens.
- **Notification-service**: Not directly connected to user-service. It receives events from order-service, not from user-service.
- **Logging & Monitoring**: Managed at the infrastructure/container level (e.g., AWS ECS logs, Azure logs), not directly in user-service code.
- **Security**: Enforced via JWT, password/mobile validation, rate limiting, SonarQube, and Snyk.

> **Note:** user-service does not directly connect to notification-service, logging, monitoring, or external APIs. Its main role is to provide authentication and user data to other services.

---

## 4. Code Quality & Security Tools

- **SonarQube**: Configured via `sonar-project.properties` in the user-service directory. SonarQube is run in the CI/CD pipeline to analyze code quality, detect bugs, code smells, and security vulnerabilities after each push or pull request.
- **Snyk**: (Recommended) Integrated in the CI/CD pipeline to scan dependencies for known vulnerabilities. Run with commands like `snyk test` or `snyk monitor` during automated builds.

Both tools are most effective when run automatically in your CI/CD workflow, ensuring every code change and dependency update is checked for quality and security before deployment.
