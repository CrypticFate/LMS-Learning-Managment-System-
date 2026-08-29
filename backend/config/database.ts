import path from 'path';
import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  if (client !== 'sqlite' && client !== 'postgres') {
    throw new Error(`Unsupported DATABASE_CLIENT: ${client}. Use "sqlite" or "postgres".`);
  }

  const ssl = env.bool('DATABASE_SSL', false)
    ? { rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', false) }
    : false;
  const databaseUrl = env('DATABASE_URL');

  const acquireConnectionTimeout = env.int('DATABASE_CONNECTION_TIMEOUT', 60000);

  if (client === 'sqlite') {
    return {
      connection: {
        client: 'sqlite',
        connection: {
          filename: path.join(
            __dirname,
            '..',
            '..',
            env('DATABASE_FILENAME', '.tmp/data.db'),
          ),
        },
        useNullAsDefault: true,
        acquireConnectionTimeout,
      },
    };
  }

  return {
    connection: {
      client: 'postgres',
      connection: {
        connectionString: databaseUrl,
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', ''),
        ssl,
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', 0),
        max: env.int('DATABASE_POOL_MAX', 10),
      },
      acquireConnectionTimeout,
    },
  };
};

export default config;
