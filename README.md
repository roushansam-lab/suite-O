# 🌸 SUITE 'O' — Salon & Makeup Studio Management SaaS

> **Production-ready, India-first SaaS for salons, makeup studios, and beauty professionals.**  
> Built with Next.js 14, Supabase, Tailwind CSS, and deployed on Vercel.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Local Setup](#local-setup)
5. [Supabase Setup](#supabase-setup)
6. [Environment Variables](#environment-variables)
7. [Deployment](#deployment)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [WhatsApp Integration](#whatsapp-integration)
11. [Role-Based Access](#role-based-access)

---

## ✨ Features

### Core
| Module | Features |
|--------|---------|
| **Appointments** | Calendar view, staff-wise booking, conflict detection, buffer time, status tracking |
| **Customer CRM** | Profiles, visit history, skin/hair type, loyalty points, tags, search |
| **Billing / POS** | GST-ready invoicing, UPI/Cash/Card, coupons, split payments, loyalty redemption |
| **Inventory** | Stock tracking, low-stock alerts, expiry alerts, supplier management |
| **Staff** | Profiles, attendance, commission tracking, performance dashboard |
| **Analytics** | Revenue charts, service popularity, staff performance, customer growth |
| **Settings** | Salon profile, services/pricing, working hours, memberships, coupons |

### Advanced
- 📱 **WhatsApp Automation** — booking confirmations, reminders, campaigns (Twilio)
- 🏆 **Loyalty Program** — points earn/redeem, membership plans
- 🏢 **Multi-location Ready** — schema supports multiple branches
- 🖼️ **Media Gallery** — before/after photos, customer portfolios
- 🔒 **Row Level Security** — each salon can only see their own data
- 🌙 **Dark Mode** — full dark/light theme support
- 📱 **Mobile Responsive** — works on all screen sizes

---

## 🧠 Tech Stack

```
Frontend:   Next.js 14 (App Router) + React 18 + TypeScript
Styling:    Tailwind CSS + Custom Design System
UI:         Radix UI primitives + Lucide icons + Recharts
Backend:    Next.js API Routes (Route Handlers)
Database:   Supabase (PostgreSQL) — Free tier compatible
Auth:       Supabase Auth (Email + OTP SMS)
Realtime:   Supabase Realtime subscriptions
Storage:    Supabase Storage (images)
Deploy:     Vercel (frontend) + Supabase (backend)
Messaging:  Twilio WhatsApp API (optional)
```

---

## 📁 Project Structure

```
suite-o/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Redirect to /dashboard
│   │   ├── auth/
│   │   │   └── login/page.tsx      # Login (email + OTP)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Dashboard layout (sidebar + header)
│   │   │   ├── page.tsx            # Dashboard server component
│   │   │   └── DashboardClient.tsx # Charts, stats, schedule
│   │   ├── appointments/
│   │   │   ├── page.tsx            # Appointments server component
│   │   │   └── AppointmentsClient.tsx # Calendar, booking modal
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   └── CustomersClient.tsx # CRM list + add modal
│   │   ├── billing/
│   │   │   ├── page.tsx
│   │   │   └── BillingClient.tsx   # POS terminal + invoice list
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   └── InventoryClient.tsx # Stock management
│   │   ├── staff/
│   │   │   ├── page.tsx
│   │   │   └── StaffClient.tsx     # Staff + attendance
│   │   ├── analytics/
│   │   │   ├── page.tsx
│   │   │   └── AnalyticsClient.tsx # Charts + KPIs
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   └── SettingsClient.tsx  # Salon config, services, coupons
│   │   └── api/
│   │       ├── appointments/route.ts       # GET, POST
│   │       ├── appointments/[id]/route.ts  # GET, PATCH, DELETE
│   │       ├── customers/route.ts          # GET, POST
│   │       ├── invoices/route.ts           # GET, POST
│   │       └── notifications/whatsapp/route.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         # Collapsible sidebar
│   │   │   └── Header.tsx          # Top header with search
│   │   └── ui/
│   │       └── index.tsx           # Badge, Avatar, StatCard, etc.
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser client
│   │   │   └── server.ts           # Server + admin client
│   │   ├── api/
│   │   │   └── index.ts            # API client functions
│   │   └── utils.ts                # Formatters, helpers, GST calc
│   ├── types/
│   │   └── index.ts                # All TypeScript interfaces
│   ├── middleware.ts                # Auth protection
│   └── styles/
│       └── globals.css             # Design tokens, Tailwind
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # Full DB schema + RLS
│   └── seed/
│       └── 001_demo_data.sql       # Sample data
├── .env.example
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Git

### Steps

```bash
# 1. Clone
git clone https://github.com/your-org/suite-o.git
cd suite-o

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Run development server
npm run dev

# Open http://localhost:3000
```

---

## 🗄️ Supabase Setup

### Step 1: Create Project
1. Go to [supabase.com](https://supabase.com) → Create new project
2. Choose **Free tier** (sufficient for production with moderate traffic)
3. Note your Project URL and anon key

### Step 2: Run Migrations
```bash
# Option A: Via Supabase Dashboard SQL Editor
# Paste contents of supabase/migrations/001_initial_schema.sql

# Option B: Via Supabase CLI
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### Step 3: Seed Demo Data
```sql
-- In Supabase SQL Editor, run:
-- supabase/seed/001_demo_data.sql
-- (after creating a test user via Auth dashboard)
```

### Step 4: Create First User
1. In Supabase Dashboard → Authentication → Users
2. Click "Invite user" or "Add user"
3. After creating, go to SQL Editor and run:
```sql
INSERT INTO users (id, salon_id, role, full_name)
VALUES (
  'YOUR_AUTH_USER_UUID',
  'a1b2c3d4-0000-0000-0000-000000000001',  -- demo salon ID
  'admin',
  'Your Name'
);
```

### Step 5: Configure Auth
1. Dashboard → Authentication → Settings
2. Enable **Email** provider
3. Enable **Phone** provider (requires Twilio for OTP)
4. Set Site URL to your Vercel URL

### Step 6: Storage Buckets
```sql
-- Run in SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('suite-o-media', 'suite-o-media', true);

-- Storage RLS policy
CREATE POLICY "Salon members can manage media"
ON storage.objects FOR ALL
USING (bucket_id = 'suite-o-media' AND auth.uid() IS NOT NULL);
```

---

## 🔐 Environment Variables

```env
# .env.local

# ── Supabase (required) ──
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Keep secret! Server-side only.

# ── App ──
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_NAME="Suite O"

# ── WhatsApp via Twilio (optional) ──
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# ── Email via Resend (optional) ──
RESEND_API_KEY=re_xxxx

# ── Storage ──
NEXT_PUBLIC_STORAGE_BUCKET=suite-o-media
```

> **Security note**: Never commit `.env.local`. Only `NEXT_PUBLIC_*` vars are exposed to the browser.

---

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... add all vars

# Deploy to production
vercel --prod
```

### OR via GitHub Integration
1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Auto-deploys on every push to `main`

### Custom Domain
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `app.suiteo.in`)
3. Update Supabase Auth → Settings → Site URL

---

## 📡 API Reference

All APIs require authentication (Supabase session cookie).

### Appointments

```http
GET    /api/appointments?date=2024-01-15&staff_id=xxx
POST   /api/appointments
PATCH  /api/appointments/:id
DELETE /api/appointments/:id
```

**POST body:**
```json
{
  "customer_id": "uuid",
  "staff_id": "uuid",
  "service_id": "uuid",
  "appointment_date": "2024-01-15",
  "start_time": "10:00",
  "source": "walk_in",
  "notes": "optional"
}
```

### Invoices

```http
GET  /api/invoices?status=paid&from=2024-01-01
POST /api/invoices
```

**POST body:**
```json
{
  "customer_id": "uuid",
  "line_items": [
    {
      "service_id": "uuid",
      "name": "Haircut",
      "quantity": 1,
      "unit_price": 677.97,
      "gst_rate": 18,
      "gst_amount": 122.03,
      "discount": 0,
      "total": 800
    }
  ],
  "discount_type": "percentage",
  "discount_value": 10,
  "coupon_code": "WELCOME20",
  "loyalty_points_to_use": 50,
  "payment_method": "upi"
}
```

### WhatsApp

```http
POST /api/notifications/whatsapp
GET  /api/notifications/whatsapp?limit=50
```

**POST body:**
```json
{
  "type": "booking_confirmation",
  "appointment_id": "uuid"
}
```

**Types:** `booking_confirmation`, `reminder`, `cancellation`, `birthday`

---

## 🗄️ Database Schema

### Key tables:
```
salons            → Multi-tenant root (one row per salon)
users             → Auth users with roles
staff             → Staff profiles + working hours
customers         → CRM records
service_categories → Hair, Skin, Makeup, etc.
services          → Services with pricing tiers
appointments      → Bookings with status tracking
invoices          → GST-ready invoices
payments          → Payment records (multi-method)
inventory_products → Stock items
inventory_transactions → Stock movements
loyalty_transactions → Points earn/redeem
attendance        → Daily staff attendance
notifications     → WhatsApp/SMS log
media             → Before/after photos
```

### GST Fields on Invoice:
```
subtotal       → Pre-tax total
cgst_amount    → Central GST (9% for 18% rate)
sgst_amount    → State GST (9% for 18% rate)
igst_amount    → Interstate GST (18%, if applicable)
total_tax      → CGST + SGST + IGST
grand_total    → Final payable amount
```

---

## 📱 WhatsApp Integration

### Option A: Twilio (Recommended for production)
1. Create account at [twilio.com](https://twilio.com)
2. Apply for WhatsApp Business API
3. Get sandbox number for testing
4. Add credentials to `.env.local`

### Option B: Mock Mode (Dev/Testing)
If Twilio credentials are not configured, the API operates in **mock mode**:
- Messages are logged to the console
- Notification records are saved to DB with `status: 'sent'`
- No actual WhatsApp messages sent

### Message Templates
Templates are in `/src/app/api/notifications/whatsapp/route.ts`:
- `booking_confirmation` — sent after booking
- `reminder` — sent 24h before appointment
- `cancellation` — sent on cancel
- `birthday` — sent on customer birthday with discount

---

## 🔒 Role-Based Access

| Permission | super_admin | admin | manager | staff | receptionist |
|-----------|:-----------:|:-----:|:-------:|:-----:|:------------:|
| View dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage appointments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create invoices | ✅ | ✅ | ✅ | ✅ | ✅ |
| View customers | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage staff | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage inventory | ✅ | ✅ | ✅ | ❌ | ❌ |
| Salon settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 🇮🇳 India-Specific Features

- **GST Ready**: CGST + SGST breakdown on all invoices
- **Indian phone number formatting**: `+91` prefix handling
- **UPI payments**: Native payment method support
- **INR currency**: Formatted with Indian number system (₹1,00,000)
- **Indian timezone**: Default Asia/Kolkata
- **WhatsApp-first**: Primary communication channel for Indian customers

---

## 🤝 Multi-Salon / SaaS Mode

Each salon is completely isolated via:
1. **Row Level Security (RLS)**: Database-level isolation
2. **`salon_id` on every table**: Every query scoped to salon
3. **Middleware auth check**: Session validated on every request

To onboard a new salon:
```sql
-- 1. Insert salon record
INSERT INTO salons (name, slug, phone, city, state) VALUES (...);

-- 2. Create auth user in Supabase dashboard

-- 3. Link user to salon
INSERT INTO users (id, salon_id, role, full_name) VALUES (...);
```

---

## 📊 Performance

- **Supabase Free Tier**: Handles ~500 concurrent users, 500MB database
- **Vercel Free Tier**: Unlimited deployments, 100GB bandwidth
- **Images**: Served via Supabase CDN
- **Caching**: Next.js ISR for static content, SWR for client data

---

## 🛠️ Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npm run type-check   # TypeScript check
npm run db:generate  # Generate Supabase TypeScript types
```

---

## 📞 Support

Built with ❤️ for Indian salon owners by Suite O.

For enterprise support, custom features, or white-labeling:
- 📧 hello@suiteo.in
- 💬 WhatsApp: +91-XXXXXXXXXX

---

*Suite 'O' — Because your salon deserves the best.*
