# OTC Market Portal — ГЦБ Портал

Портал внебиржевой торговли Государственными Ценными Бумагами (ГЦБ).

## Быстрый старт

### Требования
- Node.js 20+
- Docker + Docker Compose

### 1. Запустить PostgreSQL

```bash
docker compose up -d
```

### 2. Установить зависимости

```bash
npm install          # root workspace
npm install --prefix server
npm install --prefix client
```

### 3. Миграции и начальные данные

```bash
cd server
npm run migrate
npm run seed
```

### 4. Запустить сервисы

Терминал 1 (backend):
```bash
cd server && npm run dev
```

Терминал 2 (frontend):
```bash
cd client && npm run dev
```

Приложение: http://localhost:3000

## Тестовые аккаунты

| Роль       | Email                    | Пароль       |
|------------|--------------------------|--------------|
| Admin      | admin@govbroker.kg       | admin123     |
| Investor   | investor1@example.com    | investor123  |
| Investor   | investor2@example.com    | investor123  |

## Структура

```
gov_broker_app/
├── client/          # React 18 + TypeScript + Vite + Tailwind
│   └── src/
│       ├── pages/   # LoginPage, MarketPage, PortfolioPage, TradesPage, AdminPage, BalancesPage
│       ├── components/
│       ├── api/     # axios + typed API helpers
│       ├── store/   # zustand auth store
│       └── hooks/   # useSocket (Socket.io)
├── server/          # Express + TypeScript + Socket.io
│   └── src/
│       ├── routes/  # auth, bonds, trades, portfolio, reports
│       ├── services/# pricing.ts (YTM, НКД, Ask/Bid)
│       ├── middleware/
│       └── db/      # schema.sql, migrate.ts, seed.ts
└── docker-compose.yml
```

## API

| Method | Path                   | Auth  | Описание                            |
|--------|------------------------|-------|-------------------------------------|
| POST   | /api/auth/login        | —     | Получить JWT                        |
| GET    | /api/bonds             | JWT   | Витрина с актуальными ценами        |
| POST   | /api/bonds             | Admin | Создать облигацию                   |
| PUT    | /api/bonds/:id/ytm     | Admin | Обновить YTM → пересчёт + socket   |
| POST   | /api/trades            | JWT   | Создать сделку buy/sell             |
| GET    | /api/trades            | JWT   | Журнал (admin = все, investor = свои)|
| GET    | /api/portfolio         | JWT   | Портфель инвестора                  |
| GET    | /api/reports/margin    | Admin | Ведомость маржинального дохода      |
| GET    | /api/reports/balances  | Admin | Реестр остатков клиентов            |
| GET    | /api/reports/summary   | Admin | Сводная статистика для дашборда     |

## Формулы ценообразования

```
P_clean = Σ C/(1+r/n)^t + M/(1+r/n)^N   (дисконтирование потоков)
НКД     = C/n × (дней с купона / дней в периоде)
P_dirty = P_clean + НКД
Ask     = P_dirty × 1.025   (+2.5% спред)
Bid     = P_dirty × 0.975   (-2.5% спред)
Маржа   = quantity × P_dirty × 0.05
```
