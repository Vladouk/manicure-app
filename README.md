# 💅 Manicure Booking App — Telegram Mini App

A full-featured appointment booking system built as a **Telegram Mini App (WebApp)** for a manicure studio. Clients book appointments directly inside Telegram, while the admin manages everything through a built-in admin panel — no separate dashboard needed.

**Live in production**, serving real clients with automated reminders, referral system, and business analytics.

---

## 🎯 Key Features

### Client Side
- **Multi-step booking flow** — service selection → nail length → design → time slot → photo upload → confirmation
- **Real-time slot availability** — only shows slots 30+ minutes in the future
- **Photo uploads** — reference images (desired design) + current hands photos, up to 5 each
- **Appointment history** — view past and upcoming bookings with status indicators
- **Reschedule & cancel** — clients can modify their own appointments
- **Bonus points system** — earn points per visit, redeem for discounts (5pts = free design, 10pts = 50% off, 14pts = free session)
- **Referral program** — unique referral codes, 20% discount for referee, 2 bonus points for referrer
- **Active promotions** — percentage or fixed discounts applied automatically
- **Dark/Light theme** — adapts to Telegram's theme

### Admin Panel (in-app)
- **Appointments management** — approve/cancel/delete with optional client notification via Telegram bot
- **Calendar view** — visual day-by-day schedule with slot management
- **Client database** — full history per client, total visits, blacklist management
- **Price management** — dynamic price list with categories, length options, and design tiers
- **Analytics dashboard** — popular hours/days, monthly revenue, forecast, new clients graph
- **Broadcast messaging** — send announcements to all clients
- **Bonus points control** — manually add points to any client
- **Blacklist** — block problematic clients from booking

### Telegram Bot
- **Webhook-based** — no polling, instant responses
- **Appointment notifications** — new booking, confirmation, cancellation, price changes
- **Automated reminders** — 1 day before (18:00) + 3 hours before appointment
- **Daily admin report** — summary at 18:00 with stats and revenue
- **Auto-cancel** — unconfirmed appointments expire after 24h, slots get freed

---

## 🏗️ Architecture

```
┌──────────────────────┐
│   Telegram Client    │
│   (Mini App WebApp)  │
└──────────┬───────────┘
           │ HTTPS
           ▼
┌──────────────────────┐       ┌─────────────────┐
│   Express.js Server  │──────▶│   PostgreSQL    │
│   (API + Static +    │       │   (Railway)     │
│    Bot Webhook)      │       └─────────────────┘
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Telegram Bot API   │
│   (Notifications)    │
└──────────────────────┘
```

**Single-server deployment** — Express serves the React build, API endpoints, file uploads, and processes bot webhooks, all from one process.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, react-calendar, @twa-dev/sdk |
| **Backend** | Node.js, Express 5 |
| **Database** | PostgreSQL (with SSL) |
| **Bot** | node-telegram-bot-api (webhook mode) |
| **File Upload** | Multer (disk storage, 5MB limit) |
| **Scheduling** | node-cron (reminders, cleanup, reports) |
| **Auth** | Telegram WebApp initData HMAC-SHA256 validation |
| **Hosting** | Railway |

---

## 📁 Project Structure

```
├── client/
│   ├── src/
│   │   ├── App.js              # Main React component (SPA)
│   │   ├── index.js            # React entry point
│   │   ├── index.css           # Base styles
│   │   └── styles/
│   │       └── theme.css       # Full UI theme (cards, buttons, modals, calendar)
│   ├── public/
│   │   └── index.html          # HTML template
│   ├── build/                  # Production build (served by Express)
│   └── package.json
│
├── server/
│   ├── server.js               # Express server, all API routes, bot logic, cron jobs
│   ├── uploads/                # User-uploaded photos (reference + current hands)
│   └── package.json
│
├── package.json                # Root: start & build scripts
├── .gitignore
└── .npmrc
```

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `work_slots` | Available time slots (date, time, is_booked) |
| `appointments` | All bookings with full details, photos, status |
| `reminders` | Tracks which appointments got reminder notifications |
| `client_points` | Bonus points balance + referral discount flag |
| `service_categories` | Service categories (Укріплення, Нарощення, etc.) |
| `services` | Individual services with prices |
| `promotions` | Active/scheduled discount campaigns |
| `referral_codes` | Per-client unique referral codes |
| `referral_uses` | Tracks who used which referral code |
| `bonus_uses` | History of bonus point redemptions |
| `blacklist` | Blocked clients |

---

## 🔌 API Endpoints

### Client
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/appointment` | Create booking (multipart: photos + data) |
| GET | `/api/appointment/my?tg_id=` | Client's appointment history |
| POST | `/api/appointment/cancel` | Cancel own appointment |
| POST | `/api/appointment/reschedule` | Reschedule to a new slot |
| GET | `/api/slots` | Available time slots |
| GET | `/api/prices` | Price list for booking flow |
| GET | `/api/client/points?tg_id=` | Bonus points balance |
| POST | `/api/client/spend-points` | Redeem bonus points |
| GET | `/api/promotions` | Active promotions |
| GET | `/api/referral/code?tg_id=` | Get/generate referral code |
| POST | `/api/referral/apply` | Validate referral code |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/appointments` | All appointments (filterable by status) |
| POST | `/api/admin/status` | Approve/cancel appointment |
| POST | `/api/admin/delete` | Delete appointment |
| POST | `/api/admin/appointment/price` | Update appointment price |
| POST | `/api/admin/mark-viewed` | Mark new appointments as seen |
| POST | `/api/admin/add-points` | Add bonus points to client |
| GET | `/api/admin/clients` | All clients with visit stats |
| GET | `/api/admin/client-history?tg_id=` | Single client's full history |
| POST | `/api/admin/broadcast` | Send message to all clients |
| GET | `/api/admin/slots` | All slots with booking info |
| POST | `/api/admin/add-slot` | Create new time slot |
| POST | `/api/admin/delete-slot` | Remove time slot |
| GET | `/api/admin/prices` | Service categories & prices |
| GET | `/api/admin/prices-structure` | Full price structure (JSON) |
| POST | `/api/admin/prices-structure` | Update price structure |
| POST | `/api/admin/category` | Add/edit service category |
| DELETE | `/api/admin/category/:id` | Delete category |
| POST | `/api/admin/service` | Add/edit service |
| DELETE | `/api/admin/service/:id` | Delete service |
| GET | `/api/admin/promotions` | All promotions |
| POST | `/api/admin/promotion` | Add/edit promotion |
| DELETE | `/api/admin/promotion/:id` | Delete promotion |
| POST | `/api/admin/blacklist` | Add client to blacklist |
| GET | `/api/admin/blacklist` | Get blacklisted clients |
| POST | `/api/admin/blacklist/remove` | Remove from blacklist |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/analytics` | Combined stats overview |
| GET | `/api/admin/analytics/hours` | Most popular booking hours |
| GET | `/api/admin/analytics/days` | Most popular days of week |
| GET | `/api/admin/analytics/monthly-revenue` | Current month revenue |
| GET | `/api/admin/analytics/forecast` | Next month forecast (3-month avg) |
| GET | `/api/admin/analytics/new-clients` | New clients per day (30 days) |

---

## 🔐 Security

- **Telegram WebApp initData validation** — HMAC-SHA256 signature verification on every admin endpoint
- **Admin role check** — Telegram user ID whitelist for admin operations
- **Blacklist enforcement** — blocked clients cannot create appointments
- **File upload limits** — 5MB max per file, disk storage with unique filenames
- **Environment-based auth** — relaxed in development, strict in production

---

## ⚙️ Environment Variables

```env
BOT_TOKEN=           # Telegram Bot API token
DATABASE_URL=        # PostgreSQL connection string
CLIENT_URL=          # Frontend URL (for bot WebApp buttons)
WEBHOOK_URL=         # Telegram webhook URL (POST /bot)
PORT=3000            # Server port
NODE_ENV=production  # Enables strict auth validation
```

---

## 🚀 Deployment

The app is deployed on **Railway** with automatic builds:

1. `npm run build` — builds the React client
2. `npm start` — starts the Express server which serves the built client + API

```bash
# Build
cd client && npx react-scripts build

# Start
node server/server.js
```

---

## 🧑‍💻 Local Development

```bash
# 1. Clone
git clone https://github.com/Vladouk/manicure-app.git
cd manicure-app

# 2. Install dependencies
npm install
cd client && npm install && cd ..

# 3. Set up environment
# Create .env in root with required variables (see above)

# 4. Start server
node server/server.js

# 5. Start client (separate terminal)
cd client && npm start
```

> **Note:** You need a PostgreSQL instance and a Telegram Bot token. For local development, `NODE_ENV` is not set to `production`, so auth validation is relaxed.

---

## 📊 Automated Background Jobs

| Schedule | Job | Description |
|----------|-----|-------------|
| Every 5 min | Cancel expired pending | Auto-cancels unconfirmed bookings older than 24h |
| Every 5 min | Slot cleanup | Removes unbooked slots less than 30 min away |
| Daily 18:00 | Day-before reminder | Notifies clients about tomorrow's appointments |
| Every 5 min | 3-hour reminder | Notifies clients 3 hours before their appointment |
| Daily 18:00 | Admin daily report | Sends stats summary to admins |
| Daily 00:00 | Old slot cleanup | Deletes slots older than 30 days |
| Monthly 1st | DB cleanup | Removes reminders for appointments older than 90 days |

---

## 📝 License

Private project. All rights reserved.
