const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().trim(),
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "password must contain uppercase, lowercase and a number",
    ),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  role: Joi.string().valid("customer", "restaurant_owner").default("customer"),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow("", null),
  address: Joi.object({
    street: Joi.string().max(200).allow("", null),
    city: Joi.string().max(100).allow("", null),
    state: Joi.string().max(100).allow("", null),
    zipCode: Joi.string().max(20).allow("", null),
    country: Joi.string().max(100).allow("", null),
  }),
}).min(1); // At least one field must be provided

module.exports = { registerSchema, loginSchema, updateProfileSchema };
