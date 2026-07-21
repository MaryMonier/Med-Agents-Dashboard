# Med Agents – Admin Dashboard

Admin-facing dashboard for the Med Agents platform. Used by administrators to manage doctors,
patients, consultations, prescriptions, follow-ups, subscriptions/payments, and to view
platform-wide stats and reports.

Built with **Angular 21**, **Angular Material**, and **Chart.js**.

## Tech Stack

- **Framework:** Angular 21 (standalone components)
- **UI:** Angular Material + Angular CDK
- **Charts:** Chart.js + ng2-charts
- **HTTP:** Angular `HttpClient` with interceptors
- **Auth:** JWT (decoded client-side with `jwt-decode`)
- **UI helpers:** SweetAlert2

## Project Structure

```
src/app/
├── auth/                # Login
├── dashboard/            # Dashboard layout + home/overview page with stats & charts
├── doctors/              # Doctors list, detail, and form (admin manages doctor accounts)
├── patients/              # Patients list, form, history, visit, select-patient
├── consultations/          # Consultation list & details
├── prescriptions/           # Prescription views
├── followups/               # Follow-ups list & details
├── subscriptions/            # Subscriptions list (admin view)
├── payments/                 # Payments records
├── reports/                  # Reports list
├── contact/                  # Contact messages
├── shared/                   # Navbar, sidebar, modals, reusable cards
├── guards/                    # Route guards (auth/role protection)
├── interceptors/               # HTTP interceptors (auth token, error handling)
├── services/                    # API services per domain
└── models/                       # TypeScript interfaces/models
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 11+
- The [backend API](../backend) running and reachable

### Installation

```bash
npm install
```

### Environment Variables

This project uses Angular environment files instead of a `.env` file:

- `src/environments/environment.ts` — development config (`apiUrl` pointing at your local backend)
- `src/environments/environment.prod.ts` — production config (`apiUrl` pointing at the deployed backend)

Update `apiUrl` in the relevant file to point at your backend instance.

### Running

```bash
# Development server (http://localhost:4200)
npm start
# or
ng serve

# Production build
npm run build

# Watch build (development config)
npm run watch

# Unit tests
npm test
```

## Key Features

- **Doctors management** — list, view, create/edit, and manage doctor accounts
- **Patients** — view patients across all doctors, patient history, visits
- **Consultations & Prescriptions** — review clinical records across the platform
- **Follow-ups** — track patient follow-ups
- **Subscriptions & Payments** — view doctor subscription status and payment records
- **Reports** — platform-wide reports
- **Contact messages** — view messages submitted through the public contact form
- **Dashboard home** — aggregated stats and charts (via Chart.js)

## Access Control

- **Guards** (`src/app/guards`) protect routes from unauthenticated/unauthorized access
- **Interceptors** (`src/app/interceptors`) attach the JWT to outgoing requests and handle
  auth-related errors (e.g. redirecting to login on `401`)
- Admin-only backend endpoints require the logged-in user to have the `admin` role

## Notes

- Do not commit any file containing API keys, tokens, or credentials.
- Avoid committing generated/debug files (e.g. stray shell output files) to the repository.

## License

Internal project — license TBD.
