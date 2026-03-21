const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  deleteProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// @route   GET /api/users/profile
// @desc    Get logged-in user's profile
// @access  Private
router.get("/profile", getProfile);

// @route   PUT /api/users/profile
// @desc    Update logged-in user's profile
// @access  Private
router.put("/profile", updateProfile);

// @route   DELETE /api/users/profile
// @desc    Deactivate logged-in user's account
// @access  Private
router.delete("/profile", deleteProfile);

module.exports = router;
