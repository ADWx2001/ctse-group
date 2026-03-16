const Joi = require('joi');

const createOrderSchema = Joi.object({
  restaurantId: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      menuItemId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required(),
  deliveryAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().allow('', null),
    zipCode: Joi.string().allow('', null),
    country: Joi.string().default('Sri Lanka')
  }).required(),
  specialInstructions: Joi.string().max(500).allow('', null)
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')
    .required()
});

module.exports = { createOrderSchema, updateStatusSchema };
