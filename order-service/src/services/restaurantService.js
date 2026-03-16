const axios = require('axios');

const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002';

/**
 * Get restaurant details from Restaurant Service.
 */
const getRestaurant = async (restaurantId) => {
  try {
    const response = await axios.get(`${RESTAURANT_SERVICE_URL}/api/restaurants/${restaurantId}`, {
      timeout: 5000
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const error = new Error('Restaurant not found');
      error.statusCode = 404;
      throw error;
    }
    const error = new Error('Restaurant Service unavailable');
    error.statusCode = 503;
    throw error;
  }
};

/**
 * Get a single menu item's current details (price, availability) from Restaurant Service.
 */
const getMenuItem = async (itemId) => {
  try {
    const response = await axios.get(`${RESTAURANT_SERVICE_URL}/api/menu/${itemId}`, {
      timeout: 5000
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const error = new Error(`Menu item ${itemId} not found`);
      error.statusCode = 404;
      throw error;
    }
    const error = new Error('Restaurant Service unavailable');
    error.statusCode = 503;
    throw error;
  }
};

module.exports = { getRestaurant, getMenuItem };
