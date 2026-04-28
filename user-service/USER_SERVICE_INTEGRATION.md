# User Service Integration & Security Documentation

## 1. Connected Services

### a. Order Service
- **How connected:**
  - Uses `USER_SERVICE_URL` (e.g., `http://user-service:3001`) as an environment variable.
  - Calls `/api/auth/validate` endpoint to validate JWT tokens for user authentication.
  - Defined in `docker-compose.yml` as a dependency for startup order and health checks.
  - See: `order-service/src/services/userService.js` for integration logic.

### b. Restaurant Service
- **How connected:**
  - Uses `USER_SERVICE_URL` for user-related operations (e.g., authentication, authorization).
  - Depends on user-service for health and readiness in Docker Compose.

### c. Frontend
- **How connected:**
  - Uses `NEXT_PUBLIC_USER_SERVICE_URL` (default: `http://localhost:3001`) to call user-service endpoints for registration, login, profile, etc.
  - Handles JWT tokens in localStorage and sends them as Authorization headers.
  - See: `frontend/src/lib/api.ts` for API integration.

## 2. Security Validations

### a. Backend (user-service)
- **Password validation:**
  - Enforced via Joi schema: minimum 8 chars, must include uppercase, lowercase, and a number.
- **Mobile number validation:**
  - Enforced via Joi: must match Sri Lankan format (`+947XXXXXXXX` or `07XXXXXXXX`).
- **JWT authentication:**
  - All protected endpoints require a valid JWT.
  - `/api/auth/validate` endpoint is used by other services to verify tokens.
- **Rate limiting:**
  - Applied to authentication routes to prevent brute-force attacks.
- **SonarQube:**
  - Configured via `sonar-project.properties` for code quality and security scanning.
- **Snyk:**
  - (Recommended) Run in CI to scan dependencies for vulnerabilities.

### b. Frontend
- **Password fields:**
  - Show/hide toggle for user convenience and security.
- **Client-side validation:**
  - Checks for password match and minimum length before submitting.
- **Token handling:**
  - JWT stored in localStorage and sent with each API request.

## 3. API Endpoints (user-service)
- `/api/auth/register` — Register new users (validates password, phone, etc.)
- `/api/auth/login` — User login (returns JWT)
- `/api/auth/validate` — Validate JWT (used by other services)
- `/api/users/profile` — Get/update user profile (JWT required)

## 4. Pages Involved

### Frontend
- `frontend/src/app/register/page.tsx` — Registration form (password/mobile validation, show/hide password)
- `frontend/src/app/login/page.tsx` — Login form
- `frontend/src/context/AuthContext.tsx` — Handles authentication logic

### Backend
- `user-service/src/controllers/authController.js` — Handles registration, login, validation
- `user-service/src/validators/authValidators.js` — Joi validation logic
- `user-service/src/models/User.js` — User schema and password hashing

## 5. Summary
- The user-service is central for authentication and user data.
- Order-service and restaurant-service depend on it for user identity and JWT validation.
- Security is enforced at both backend (Joi, JWT, rate limiting, SonarQube, Snyk) and frontend (validation, secure token handling).

---

For more details, see the respective service documentation and code comments.