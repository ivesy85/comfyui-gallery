import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionPool = new Pool({
    connectionString: process.env.POSTGRES_URL || '',
    user: process.env.POSTGRES_USER || '',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DATABASE || '',
    password: process.env.POSTGRES_PASSWORD || '',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

if (!process.env.POSTGRES_URL || !process.env.POSTGRES_USER || !process.env.POSTGRES_PASSWORD) {
    throw new Error('Missing PostgreSQL connection environment variables');
}

export { connectionPool };
