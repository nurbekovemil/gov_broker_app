CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('admin', 'investor');
CREATE TYPE trade_type AS ENUM ('buy', 'sell');
CREATE TYPE trade_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE bond_status AS ENUM ('active', 'inactive', 'matured');

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'investor',
  full_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bonds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isin              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  nominal           NUMERIC(18,2) NOT NULL,
  coupon_rate       NUMERIC(8,6) NOT NULL,
  issue_date        DATE NOT NULL,
  maturity_date     DATE NOT NULL,
  coupon_frequency  INT NOT NULL DEFAULT 2,
  available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  status            bond_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bond_prices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bond_id     UUID NOT NULL REFERENCES bonds(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  ytm         NUMERIC(8,6) NOT NULL,
  clean_price NUMERIC(18,6) NOT NULL,
  dirty_price NUMERIC(18,6) NOT NULL,
  ask_price   NUMERIC(18,6) NOT NULL,
  bid_price   NUMERIC(18,6) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bond_id, date)
);

CREATE TABLE IF NOT EXISTS trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  bond_id         UUID NOT NULL REFERENCES bonds(id),
  trade_type      trade_type NOT NULL,
  quantity        INT NOT NULL CHECK (quantity > 0),
  price_per_bond  NUMERIC(18,6) NOT NULL,
  nkd_per_bond    NUMERIC(18,6) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(18,2) NOT NULL,
  broker_margin   NUMERIC(18,2) NOT NULL DEFAULT 0,
  status          trade_status NOT NULL DEFAULT 'completed',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  bond_id     UUID NOT NULL REFERENCES bonds(id),
  quantity    INT NOT NULL DEFAULT 0,
  avg_price   NUMERIC(18,6) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, bond_id)
);

CREATE INDEX IF NOT EXISTS idx_bond_prices_bond_date ON bond_prices(bond_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio(user_id);
