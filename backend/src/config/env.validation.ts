import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  QR_JWT_SECRET: Joi.string().allow('').optional(),
  QR_JWT_EXPIRES_IN: Joi.string().allow('').optional(),
  OWNER_NAME: Joi.string().default('Xalapasoft'),
  OWNER_EMAIL: Joi.string().email().allow('').optional(),
  OWNER_PASSWORD: Joi.string().min(8).allow('').optional(),
  APP_URL: Joi.string().allow('').optional(),
  API_URL: Joi.string().allow('').optional(),
  STAFF_PWA_URL: Joi.string().allow('').optional(),
});
