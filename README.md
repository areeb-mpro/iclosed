# SaaS Lead Management Platform

A comprehensive SaaS application for lead capture, qualification, scheduling, routing, follow-ups, and analytics.

## Features

- **Lead Capture**: Customizable booking forms with custom questions
- **Lead Qualification**: Rule-based qualification with custom criteria
- **Appointment Scheduling**: Google Calendar & Outlook integration
- **Lead Routing**: Round-robin and rule-based assignment
- **Automated Follow-ups**: Email/SMS reminders and follow-ups
- **Dashboard**: Complete lead management and analytics
- **Team Management**: Roles, permissions, and ownership

## Tech Stack

- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS
- **Authentication**: JWT, OAuth
- **Calendar**: Google Calendar API, Microsoft Graph API
- **Email**: Nodemailer, SendGrid/Twilio SendGrid
- **SMS**: Twilio

## Project Structure

```
saas-lead-management/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── config/
│   └── tests/
└── frontend/
    ├── public/
    └── src/
        ├── components/
        ├── pages/
        ├── hooks/
        ├── services/
        ├── store/
        ├── types/
        └── utils/
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (for caching and queues)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Set up environment variables
4. Run database migrations:
   ```bash
   cd backend && npx prisma migrate dev
   ```
5. Start the development servers:
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend
   cd frontend && npm run dev
   ```

## Environment Variables

### Backend

```env
DATABASE_URL=postgresql://user:password@localhost:5432/lead_management
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
SENDGRID_API_KEY=your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

## API Documentation

See [API Docs](docs/API.md) for complete API documentation.

## License

MIT
