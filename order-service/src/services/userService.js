const axios = require("axios");

const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:3001";

/**
 * Validate a JWT token by calling the User Service.
 * Returns user details if valid.
 */
const validateToken = async (token) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    });
    return response.data;
  } catch (err) {
    if (err.response) {
      const error = new Error(
        err.response.data?.error || "Token validation failed",
      );
      error.statusCode = err.response.status;
      throw error;
    }
    const error = new Error("User Service unavailable");
    error.statusCode = 503;
    throw error;
  }
};

module.exports = { validateToken };
