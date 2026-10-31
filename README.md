# MedVault — AI-Assisted Healthcare Management

<p align="center">
  <img src="public/MedVault%20Logo.png" alt="MedVault logo" width="112" />
</p>

<p align="center">
  <strong>Patient-controlled medical records. Connected clinical workflows. AI-assisted report insights.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
</p>

MedVault is an actively developed healthcare management project. The repository contains a patient-facing React application, a separate doctor portal implementation, an Express/MongoDB API, and a frontend integration with a separately hosted AI service.

The patient portal is wired through the default application entry point. Doctor portal and additional doctor/AI API route wiring are present in alternate `-MSI` entry-point files; see [Implementation and entry-point note](#implementation-and-entry-point-note) before running those workflows.

> **Project status:** Some screens use demonstration or sample health values. AI-generated information is informational assistance only—not a medical diagnosis or a substitute for professional care.

---

## Contents

- [Product Overview](#product-overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [API Overview](#api-overview)
- [Security Notes](#security-notes)
- [Roadmap](#roadmap)
- [Author](#author)

## Product Overview

MedVault is designed around two user roles:

- **Patients** use a personal portal to view their health dashboard, organize medical records, follow appointments and control sharing access.
- **Doctors** use a clinical console to request patient access and work with the selected patient's clinical information, including prescriptions and appointments.

The patient-facing health summary connects directly to a separately hosted AI service. An alternate backend configuration also includes AI proxy routes, but those routes are not mounted by the default Express entry point.

## Features

### Patient portal

- Patient registration and sign-in.
- Dashboard with a health overview, vital-statistic cards, appointment timeline and medication reminders.
- Medical record management and report upload workflows.
- Doctor/record sharing sessions with expiry information and a revoke action.
- Appointment management.
- Patient profile.
- AI health summary, report insights and report-related conversational assistant.

### Doctor portal implementation

- Separate doctor registration and sign-in screens.
- Doctor workspace / clinical dashboard.
- Patient lookup and access-request workflow.
- Centralized active-patient-session context across doctor workflows.
- Prescription and appointment workflows.
- Patient-related reports and profile views.

These screens and API modules are present in the repository. They are wired by the alternate `src/App-MSI.tsx` and `backend/src/app-MSI.js` files rather than the default entry points; see the implementation note below.

### AI-assisted report experience

- Patient UI retrieves medical records from the Express API.
- The browser sends selected PDF reports to the separately hosted AI service.
- Report analysis and summary workflows.
- Structured insights and alerts.
- Chat interface for questions about a selected report.
- An AI proxy route module with fallback handling for certain upstream errors is also present under the alternate backend entry point.

AI output can be incomplete or incorrect. It must not be treated as clinical advice or used to make healthcare decisions without a qualified professional.

## Screenshots

Add the six supplied application screenshots to a root-level `screenshots/` folder using the filenames referenced below. The README image links will display once those files are committed. Blur any personal information in the screenshots before uploading them.

### Patient experience

| Patient registration | Patient dashboard |
|---|---|
| ![Patient registration](screenshots/patient-signup.png) | ![Patient dashboard](screenshots/patient-dashboard.png) |

### Doctor experience

| Doctor registration | Doctor console |
|---|---|
| ![Doctor registration](screenshots/doctor-signup.png) | ![Doctor console](screenshots/doctor-dashboard.png) |

### AI health summary

![AI health summary](screenshots/ai-health-summary.png)

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React 19, TypeScript, React Router |
| Styling and UI | Tailwind CSS 4, Lucide React, Framer Motion |
| Frontend tooling | Vite 8, ESLint |
| Backend | Node.js, Express 4 |
| Database / ODM | MongoDB, Mongoose |
| Authentication | JSON Web Tokens, bcryptjs |
| File handling | Multer |
| API integration | Axios and Fetch |
| AI integration | Separately hosted AI service (default frontend URL: `http://localhost:8000`) |

## Architecture

At a high level, the patient client communicates with the Express API for account and medical-record operations. The AI health-summary screen calls the separately hosted AI service directly from the browser. The alternate backend configuration also contains doctor and AI route modules.

```text
            ┌──────────────────────────────┐
            │          React UI            │
            │      Patient / Doctor        │
            └──────────────┬───────────────┘
                           │
               ┌───────────▼────────────┐
               │    Express API        │
               │ Auth, records, sharing│
               │ appointments, etc.    │
               └───────────┬───────────┘
                           │
                    ┌──────▼─────┐
                    │  MongoDB   │
                    │ Mongoose   │
                    └────────────┘

        React AI screen ───────► Separate AI Service
                                (PDF analysis / chat)
```

## Repository Structure

The main folders and files are organized as follows (some UI modules are grouped by feature):

```text
MedVault/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection
│   │   ├── middlewares/     # Auth, doctor auth, error handling
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # Auth, doctor, records, sharing, AI, etc.
│   │   ├── utils/           # Tokens, encryption helpers, async handler
│   │   ├── app.js               # Default Express app
│   │   ├── app-MSI.js           # Alternate app mounting doctor / AI routes
│   │   └── server.js
│   ├── uploads/
│   ├── .env.example
│   └── package.json
├── public/                  # Static assets and MedVault logo
├── src/
│   ├── Dashboard/           # Patient and doctor dashboard screens
│   ├── App.tsx              # Default patient-side routes
│   ├── App-MSI.tsx          # Alternate routes including doctor portal
│   ├── DoctorAuth.tsx       # Doctor sign-in / registration
│   ├── DoctorDashboard.tsx  # Doctor workspace
│   ├── doctor-session/      # Active patient session context
│   ├── SignIn.tsx
│   └── Signup.tsx
├── .env.example
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm.
- A MongoDB database (local MongoDB or MongoDB Atlas).
- The separate AI service, if you want to use AI report analysis and chat.

### 1. Clone the repository

```bash
git clone https://github.com/mayanksinha07/MedVault.git
cd MedVault
```

### 2. Install frontend dependencies

From the repository root:

```bash
npm install
```

### 3. Configure the frontend

Copy the example environment file and edit it as needed:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

The checked-in frontend example contains:

```env
VITE_API_URL=http://localhost:5000
VITE_AI_API_URL=http://localhost:8000
```

### 4. Install backend dependencies

```bash
cd backend
npm install
```

Create the backend environment file:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

Set your own MongoDB connection string and a strong JWT secret in `backend/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Do not commit real secrets or populated environment files.

### 5. Start the backend

From the `backend/` directory:

```bash
npm run dev
```

The backend defaults to **http://localhost:5000** and exposes a health check at `/health`.

### 6. Start the frontend

Open another terminal at the repository root:

```bash
npm run dev
```

Vite prints the local development URL in the terminal (normally **http://localhost:5173**).

### 7. AI service (optional, for AI features)

The AI health-summary screen calls the separately hosted AI service directly. By default, the frontend expects it at:

```
http://localhost:8000
```

Set `VITE_AI_API_URL` in the root `.env` file if your AI service runs elsewhere. The AI service has its own setup and dependencies; it is not included as a Node dependency in this repository. The patient AI screen calls endpoints such as `/health`, `/api/v2/pdf/upload`, `/api/v2/insights/analyse` and `/api/v2/chatbot/ask` on that service. An optional backend proxy module is also present in the alternate backend app configuration.

## Environment Configuration

| Variable | File | Purpose |
|---|---|---|
| `VITE_API_URL` | Root `.env` | Base URL used by the frontend for the backend API |
| `VITE_AI_API_URL` | Root `.env` | AI service URL exposed to the Vite client, where used |
| `PORT` | `backend/.env` | Express server port (defaults to `5000`) |
| `MONGODB_URI` | `backend/.env` | MongoDB connection string |
| `JWT_SECRET` | `backend/.env` | Secret used to sign authentication tokens |
| `CLIENT_URL` | `backend/.env` | Configured frontend origin for CORS |
| `AI_SERVICE_URL` | Optional backend configuration | Base URL used by the alternate backend AI proxy module |

## Implementation and Entry-Point Note

There are two parallel sets of entry-point files in the current repository:

- The default root `src/main.tsx` imports `src/App.tsx`, and `backend/src/server.js` imports `backend/src/app.js`. These are the entry points used by the standard `npm run dev` and `npm run dev:backend` scripts.
- The alternate `src/App-MSI.tsx` contains the doctor routes, and `backend/src/app-MSI.js` mounts `/doctor` and `/ai` in addition to the patient API routes. The standard scripts do not currently select these alternate files automatically.

Consequently, the doctor portal is present in the repository, but the default entry points need to be aligned with the alternate `-MSI` implementations to run the complete doctor workflow. Review this wiring before presenting the entire patient-and-doctor experience as available from a fresh default checkout.

## API Overview

The default Express application mounts these route groups:

| Base path | Purpose |
|---|---|
| `/health` | Backend health check |
| `/signup`, `/auth` | Patient authentication and current-user endpoint |
| `/appointments` | Patient appointment operations |
| `/records` | Medical record operations and uploads |
| `/sharing` | Create, list and revoke sharing sessions |
| `/dashboard` | Patient dashboard summary |

The alternate `backend/src/app-MSI.js` additionally mounts `/doctor` to `doctorRoutes.js` and `/ai` to `aiRoutes.js`. The patient AI screen currently uses `VITE_AI_API_URL` to call the separate AI service directly; the AI proxy module is not mounted by the default `app.js`.

Authenticated route groups use a bearer token:

```http
Authorization: Bearer <token>
```

For exact request/response schemas, refer to the corresponding files in `backend/src/routes/`.

## Security Notes

- Keep `.env` files, database credentials, JWT secrets and AI provider keys out of Git.
- Use strong, unique secrets outside local development.
- Restrict database network access and use least-privilege database credentials.
- Treat uploaded medical documents and AI responses as sensitive data.
- Review deployment configuration, authorization checks, upload validation, logging and data-retention policies before using real patient information.

The repository includes authentication middleware, password hashing dependencies, role-specific doctor middleware and encryption helper utilities. Their presence alone does not establish that the whole application is production-hardened or compliant with any healthcare regulation.

## Roadmap

Potential areas for further development:

- Complete end-to-end testing of patient consent and doctor access workflows.
- Strengthen validation, authorization and auditability across all clinical endpoints.
- Improve AI-service reliability, observability and failure handling.
- Add automated tests and CI checks.
- Document deployment and production configuration.
- Improve accessibility and responsive behavior across portal screens.

## Author

**Mayank Sinha**  
B.Tech — Computer Science & Engineering

- GitHub: [@mayanksinha07](https://github.com/mayanksinha07)
- Project: [MedVault](https://github.com/mayanksinha07/MedVault)

---

<p align="center">
  <strong>MedVault — Organizing healthcare information with a patient-first approach.</strong>
</p>
