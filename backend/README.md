# MedVault Backend

Node.js + Express + MongoDB API for auth, appointments, records upload, sharing, and dashboard summary.

## Setup

1. Copy `.env.example` to `.env`.
2. Update `MONGODB_URI` and `JWT_SECRET`.
3. For MongoDB Atlas, use a URI like:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/medvault?retryWrites=true&w=majority&appName=MedVaultCluster
```

Atlas checklist:
- Create database user (username/password).
- Add your IP in Atlas Network Access (`0.0.0.0/0` for development).
- Use database name `medvault` (or any name you prefer in URI).

4. Install dependencies and start server:

```bash
npm install
npm run dev
```

Default server: `http://localhost:5000`

## Key Endpoints

- `POST /signup`
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `GET /appointments`
- `POST /appointments`
- `GET /records`
- `GET /records/categories`
- `POST /records/upload` (multipart/form-data with `file`)
- `GET /sharing`
- `POST /sharing`
- `PATCH /sharing/:id/revoke`
- `GET /dashboard/summary`

Authenticated routes require header:

`Authorization: Bearer <token>`
