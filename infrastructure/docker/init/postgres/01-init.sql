-- ─────────────────────────────────────────────────────────────────────────────
-- PostgreSQL initialization script
-- Creates databases for each service that uses PostgreSQL
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create per-service databases
CREATE DATABASE grab_users;
CREATE DATABASE grab_restaurants;
CREATE DATABASE grab_orders;
CREATE DATABASE grab_payments;
CREATE DATABASE grab_delivery;
CREATE DATABASE grab_promotions;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE grab_users TO grab_user;
GRANT ALL PRIVILEGES ON DATABASE grab_restaurants TO grab_user;
GRANT ALL PRIVILEGES ON DATABASE grab_orders TO grab_user;
GRANT ALL PRIVILEGES ON DATABASE grab_payments TO grab_user;
GRANT ALL PRIVILEGES ON DATABASE grab_delivery TO grab_user;
GRANT ALL PRIVILEGES ON DATABASE grab_promotions TO grab_user;

-- Enable extensions in each service DB
\c grab_users
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c grab_restaurants
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c grab_orders
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c grab_payments
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c grab_delivery
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

\c grab_promotions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
