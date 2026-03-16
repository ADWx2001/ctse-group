const User = require('../models/User');
const { updateProfileSchema } = require('../validators/authValidators');

// GET /api/users/profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Prevent role escalation via this endpoint
    delete value.role;
    delete value.password;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: value },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/profile - Soft delete (deactivate account)
exports.deleteProfile = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'Account deactivated successfully' });
  } catch (err) {
    next(err);
  }
};
