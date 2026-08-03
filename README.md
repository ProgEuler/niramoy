# Niramoy

> **Find critical care beds — fast.** Real-time ICU, NICU, CCU & HDU bed availability across hospitals in Bangladesh.

[![Live Demo](https://img.shields.io/badge/Live-niramoy.sarufkhan.com-0d9488?style=for-the-badge)](https://niramoy.sarufkhan.com)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js-000000?style=for-the-badge)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](#license)

![Niramoy – Find critical care beds near you](./http-niramoy.sarufkhan.com-.png)

---

## About

**Niramoy** is a healthcare access platform built to solve a critical problem in Bangladesh: **finding an available ICU, NICU, CCU, or HDU bed during an emergency.**

When a loved one needs critical care, every minute matters. Instead of calling hospital after hospital to check bed availability, Niramoy provides a **real-time, centralized view** of bed availability across verified hospitals — so you can find the nearest available bed before you even pick up the phone.

### Features

- 🔍 **Real-time bed availability** — Live ICU, NICU, CCU & HDU bed counts across hospitals
- 🗺️ **Interactive map view** — Visualize hospitals geographically and find the one closest to you
- 🏥 **Featured hospitals** — Verified, top-rated hospitals with current availability at a glance
- 🌐 **Multi-language support** — English & Bengali (বাংলা)
- 🎨 **Dark mode & light mode** — Toggle the theme to suit your preference
- 🔐 **Authentication** — Secure login for hospitals and administrators
- 📍 **Location-based search** — Filter by division, district, and bed type
- ⭐ **Trusted ratings** — Verified hospitals with user ratings & reviews

---

## Tech Stack

### Frontend (`/client`)
- **[Next.js 16](https://nextjs.org)** — React framework with server-side rendering
- **[React 19](https://react.dev)** — UI library
- **[TypeScript](https://www.typescriptlang.org)** — Type-safe JavaScript
- **[Tailwind CSS 4](https://tailwindcss.com)** — Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com)** — Reusable component library
- **[MapLibre GL](https://maplibre.org)** — Interactive vector maps
- **[visx](https://airbnb.io/visx)** — Data visualization components
- **[Motion](https://motion.dev)** — Animation library
- **[Tabler Icons](https://tabler.io/icons)** — Icon set

### Backend (`/backend`)
- **[FastAPI](https://fastapi.tiangolo.com)** — Modern Python web framework
- **[SQLAlchemy 2.0](https://www.sqlalchemy.org)** — ORM for database interactions
- **[Alembic](https://alembic.sqlalchemy.org)** — Database migrations
- **[Pydantic](https://docs.pydantic.dev)** — Data validation
- **[PostgreSQL](https://www.postgresql.org)** — Relational database
- **[Uvicorn](https://www.uvicorn.org)** — ASGI server

---

## 📁 Project Structure

```
niramoy/
├── client/                  # Next.js frontend
│   ├── app/                 # Next.js app router pages
│   ├── components/          # Reusable React components
│   ├── data/                # Static data and constants
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   ├── types/               # TypeScript type definitions
│   └── public/              # Static assets
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py          # FastAPI application entry point
│   │   ├── models.py        # SQLAlchemy database models
│   │   ├── schemas.py       # Pydantic schemas
│   │   └── database.py      # Database configuration
│   ├── alembic/             # Database migrations
│   ├── docker-compose.yml   # Docker services
│   └── requirements.txt     # Python dependencies
└── http-niramoy.sarufkhan.com-.png  # App screenshot
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ and **Bun** (or npm/pnpm)
- **Python** 3.11+
- **PostgreSQL** 14+
- **Docker** (optional, for running Postgres)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/niramoy.git
cd niramoy
```

### 2. Backend setup

```bash
cd backend

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
alembic upgrade head

# Start the FastAPI server
uvicorn app.main:app --reload
```

The backend will be running at `http://localhost:8000`.

📖 API docs are auto-generated at `http://localhost:8000/docs`.

### 3. Frontend setup

```bash
cd client

# Install dependencies
bun install   # or: npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API URL

# Start the dev server
bun dev   # or: npm run dev
```

The frontend will be running at `http://localhost:3000`.

### 4. Or use Docker

```bash
cd backend
docker-compose up -d
```

---

## Available Scripts

### Frontend (`/client`)
| Command | Description |
|---------|-------------|
| `bun dev` | Start the development server |
| `bun build` | Build the production bundle |
| `bun start` | Start the production server |
| `bun lint` | Run ESLint |
| `bun format` | Format code with Prettier |
| `bun typecheck` | Run TypeScript type checking |

### Backend (`/backend`)
| Command | Description |
|---------|-------------|
| `uvicorn app.main:app --reload` | Start the dev server with hot reload |
| `alembic revision --autogenerate -m "msg"` | Create a new migration |
| `alembic upgrade head` | Apply migrations |
| `alembic downgrade -1` | Roll back the last migration |

---
