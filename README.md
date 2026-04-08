# Resolvr 🎫

<div align="center">

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-AI%20Powered-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**An AI-powered internal issue ticketing system for colleges, startups, and enterprises.**

[🐛 Report Bug](https://github.com/KarishmaShakul/project-weaver/issues) · [✨ Request Feature](https://github.com/KarishmaShakul/project-weaver/issues)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [AI Features](#-ai-features)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Author](#-author)
- [License](#-license)

---

## 🎯 About

**Resolvr** is an AI-powered internal issue ticketing system designed to streamline issue reporting and resolution workflows for organizations such as colleges, startups, and enterprises.

Users (employees or students) can create and track tickets while admins (IT/support staff) can view, assign, and resolve them through a centralized dashboard — all enhanced with intelligent AI assistance powered by OpenAI.

---

## 🤖 AI Features

| Feature | Description |
|---|---|
| **Auto-categorization** | Automatically categorizes tickets based on description content |
| **Smart Priority Detection** | AI detects urgency and assigns priority (Low/Medium/High/Critical) |
| **Duplicate Detection** | Identifies similar existing tickets before submission |
| **Solution Suggestions** | Suggests relevant solutions based on ticket content and history |

---

## ✨ Features

### 👤 User Portal
- Create and submit issue tickets
- Track ticket status in real-time
- Add comments and updates to tickets
- View suggested solutions before submitting
- Receive notifications on ticket updates
- Duplicate issue detection on submission

### 👨‍💼 Admin Dashboard
- Centralized view of all tickets
- Assign tickets to team members
- Update ticket status and priority
- View analytics and resolution metrics
- Manage users and roles
- Audit trail of all ticket activity

### 🔐 Authentication & Security
- Supabase Auth (email/password)
- Role-based access control (User / Admin)
- Secure session management
- Row-level security (RLS) policies

### ⚡ Real-time
- Live ticket status updates
- Real-time comment threads
- Instant notifications via Supabase subscriptions

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, Shadcn UI |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| **AI** | OpenAI API (GPT) |
| **State Management** | React Query / Context API |
| **Component Library** | Shadcn UI, Radix UI |
| **Icons** | Lucide React |
| **Build Tool** | Vite |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                Frontend (React + TS)                 │
│  ┌─────────────┐          ┌───────────────────────┐ │
│  │ User Portal │          │    Admin Dashboard    │ │
│  │             │          │                       │ │
│  │ • Create    │          │ • View All Tickets    │ │
│  │ • Track     │          │ • Assign & Resolve    │ │
│  │ • Comment   │          │ • Analytics           │ │
│  └─────────────┘          └───────────────────────┘ │
│              Service Layer (API calls)               │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
    ┌──────────▼──────┐  ┌───────▼────────┐
    │   Supabase      │  │   OpenAI API   │
    │                 │  │                │
    │ • PostgreSQL DB │  │ • Auto-category│
    │ • Auth          │  │ • Priority AI  │
    │ • Storage       │  │ • Duplicate    │
    │ • Realtime      │  │ • Suggestions  │
    └─────────────────┘  └────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm or bun
- Supabase account (free tier)
- OpenAI API key

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/KarishmaShakul/project-weaver.git
cd project-weaver
```

**2. Install dependencies**
```bash
npm install
# or
bun install
```

**3. Configure environment variables**

Create `.env` file in root:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

**4. Set up Supabase**
- Create a new Supabase project
- Run the SQL migrations from `/supabase` folder
- Enable Row Level Security (RLS)
- Configure Auth settings

**5. Start the development server**
```bash
npm run dev
# or
bun dev
```

**6. Open in browser**
```
http://localhost:5173
```

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `VITE_OPENAI_API_KEY` | Your OpenAI API key |

---

## 🗄 Database Schema

### Tickets Table
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | Text | Ticket title |
| `description` | Text | Detailed description |
| `status` | Enum | open, in_progress, resolved, closed |
| `priority` | Enum | low, medium, high, critical |
| `category` | Text | AI auto-categorized |
| `user_id` | UUID | Foreign key → Users |
| `assigned_to` | UUID | Foreign key → Users (admin) |
| `created_at` | Timestamp | Creation time |
| `updated_at` | Timestamp | Last update time |

### Comments Table
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `ticket_id` | UUID | Foreign key → Tickets |
| `user_id` | UUID | Foreign key → Users |
| `content` | Text | Comment content |
| `created_at` | Timestamp | Creation time |

### Users Table (via Supabase Auth)
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | Text | User email |
| `role` | Enum | user, admin |
| `full_name` | Text | Display name |
| `created_at` | Timestamp | Join date |

---

## 📁 Project Structure

```
resolvr/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/          # Shadcn UI components
│   │   ├── tickets/     # Ticket-related components
│   │   ├── dashboard/   # Admin dashboard components
│   │   └── shared/      # Shared/common components
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Tickets.tsx
│   │   ├── TicketDetail.tsx
│   │   └── Admin.tsx
│   ├── services/
│   │   ├── supabase.ts  # Supabase client & queries
│   │   ├── ai.ts        # OpenAI integration
│   │   └── tickets.ts   # Ticket service layer
│   ├── hooks/           # Custom React hooks
│   ├── context/         # React context providers
│   ├── types/           # TypeScript type definitions
│   └── lib/             # Utility functions
├── supabase/
│   └── migrations/      # SQL migration files
├── .env
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

---

## 👩‍💻 Author

**Karishma Shakul**
- CS Undergraduate
- GitHub: [@KarishmaShakul](https://github.com/KarishmaShakul)

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

Made with ❤️ by Karishma Shakul

⭐ Star this repo if you found it helpful!

</div>
