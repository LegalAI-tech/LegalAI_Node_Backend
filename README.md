<div align="center">

<img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
<img src="https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express" />
<img src="https://img.shields.io/badge/PostgreSQL-Prisma-336791?style=for-the-badge&logo=postgresql" />
<img src="https://img.shields.io/badge/Redis-Upstash-FF4438?style=for-the-badge&logo=redis" />
<img src="https://img.shields.io/badge/Passport-JWT-34E27A?style=for-the-badge&logo=passport" />
<img src="https://img.shields.io/badge/Gemini_Orchestrator-Python_BFF-4285F4?style=for-the-badge&logo=google" />

# ⚖️ Nyay Mitra — Node.js BFF & API Gateway

### Production-Grade API Gateway, User & Case Management Service for Indian Law

**Role-Based Security · Case Matters Workspace · Encrypted PII · Persistent Context Management**

</div>

---

## 📌 Overview

This repository contains the **Backend-for-Frontend (BFF)** and **API Gateway** for **Nyay Mitra**, a production-grade legal AI platform built for the Indian legal system.

Written in **TypeScript** using **Express** and **Prisma ORM**, this service acts as the single entry point for client applications (web/mobile). It manages user roles, handles authentication and Multi-Factor Auth (MFA), manages matter-based lawyer workspaces, enforces PII encryption, handles file-upload buffering, and stores conversation/message state. It communicates downstream with the **Python FastAPI Agentic Backend** to execute LangGraph-based legal reasoning workflows.

---

## ✨ Features

### 👥 Multi-Role User Authentication & Security

- **Citizen Mode**: Local register/login & Firebase Google Auth. Normal/Agentic chat with public conversation sharing (view caps & expiration).
- **Lawyer Mode**: Bar-number validated registration, mandatory email-based 2FA (bcrypt OTP), and secure password reset.
- **Lawyer Firms**: Organization-level signup, strictly enforced session timeouts (4 hours), IP-address tracking, and automated member role delegation (Owner, Associate, Intern).
- **PII Encryption**: Sensitive lawyer/firm identifiers (Phone, Bar Number, Registration, GST) are AES-256-GCM encrypted at rest.

### 💼 Matter-Based Lawyer Workspace

- **Matter Workspaces**: Case CRUD operations (ACTIVE, CLOSED, ARCHIVED stages) detailing court names, case numbers, parties, and lawyer-only case notes.
- **Workspace Memory**: Persistent matter context containing `partySummary`, `factChronology`, `legalIssues`, `documentIndex`, `keyDates`, `lawyerNotes`, and `aiSummary`.
- **Context Injection**: Automatically constructs and injects the matter's Workspace Memory payload into downstream Agentic chat queries.
- **Background Memory Update**: Automatically triggers background AI-summary regeneration on the Python service every **5 user messages**.

### 📂 Case Document Management Vault

- **Multi-Document Upload**: Handles secure Multi-Document uploads (PDF, DOC, DOCX, TXT up to 20MB) using `multer` in-memory buffering.
- **Vector Ingestion & Versioning**: Registers documents with the database, routes them to Python for SHA-256 deduplication and ChromaDB vector indexing, and tracks version history (`DocumentVersion[]`).

### 🤖 Generative Legal Workflows (BFF Proxy)

- **Legal Document Generation**: Jinja2-templated legal draft generation (PDF, DOCX, TXT downloads) with field schema validation.
- **Client Communications**: Automated drafting of WhatsApp updates, emails, and voice note scripts based on recent court outcomes and chronological facts.
- **Contract Review**: Professional-grade contract audits providing either raw legal clause reviews or simplified client-friendly summaries.
- **Real-Time Hearing & Deadlines Dashboard**: Upcoming hearing dates scheduler, deadline calculators, and automated reminder alerts.

---

## 🏗️ System Architecture

The Node.js BFF lies at the heart of Nyay Mitra's routing, orchestration, and persistence architecture:

```
┌────────────────────────────────────────────────────────┐
│                     Frontend (React)                   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JWT Auth
┌───────────────────────────▼────────────────────────────┐
│            Node.js BFF (Express + Prisma) [This Repo]  │
│                                                        │
│  ┌──────────────────┐ ┌──────────────────────────────┐ │
│  │  Citizen Router  │ │        Lawyer Router         │ │
│  │  /api/auth       │ │        /api/lawyer/auth      │ │
│  │  /api/chat       │ │        /api/lawyer/chat      │ │
│  │  /api/documents  │ │        /api/lawyer/matter    │ │
│  │  /api/translation│ │        /api/lawyer/events    │ │
│  │  /api/user       │ │        /api/lawyer/comms     │ │
│  │                  │ │        /api/lawyer/contract  │ │
│  └────────┬─────────┘ └──────────────┬───────────────┘ │
│           │                          │                 │
│           └─────────────┬────────────┘                 │
│                         ▼                              │
│             Passport JWT Auth & Guard                  │
│                         │                              │
│         ┌───────────────┴───────────────┐              │
│         ▼                               ▼              │
│   Prisma Client                  Axios Client          │
└─────────┬───────────────────────────────┼──────────────┘
             │                               │ HTTP (v3)
┌─────────▼───────────────┐     ┌─────────▼──────────────┐
│       PostgreSQL        │     │  Python FastAPI Agent  │
│ (Conversations, Matters,│     │  (LangGraph, ChromaDB, │
│  WorkspaceMemory, etc.) │     │   Gemini LLM / Emb)    │
└─────────────────────────┘     └────────────────────────┘
```

---

## 📂 Project Structure

```
node_backend/
├── prisma/
│   └── schema.prisma             # PostgreSQL models for Users, Lawyers, Firms, Matters, Memory, and Events
├── src/
│   ├── app.ts                    # Express app initialization, routing mount points, middleware setup
│   ├── server.ts                 # HTTP server listener and Prisma DB connection handler
│   ├── config/
│   │   ├── database.ts           # Prisma client initialization
│   │   └── passport.ts           # Passport.js JWT configuration
│   ├── middleware/
│   │   ├── auth.middleware.ts    # Universal authentication, Lawyer role validation, Firm guards
│   │   ├── cors.middleware.ts    # CORS setup restricted to environment urls
│   │   ├── error.middleware.ts   # Structured global exception and logging handler
│   │   └── rateLimiter.middleware.ts # API request rate limits
│   ├── services/
│   │   ├── python-backend.service.ts # Downstream API consumer client (Axios + Timeout)
│   │   ├── encryption.service.ts # AES-256-GCM encryption helper for sensitive PII
│   │   ├── otp.service.ts        # Bcrypt-hashed OTP generation and validation
│   │   └── cache.service.ts      # Upstash Redis wrapper for system templates and capabilities caching
│   ├── types/
│   │   └── python-backend.types.ts # TypeScript interfaces mapping Python inputs/outputs
│   └── module/
│       ├── auth/
│       │   ├── citizen/          # Citizen auth controller and registration routes
│       │   ├── lawyer/           # Lawyer multi-step authentication (Register, OTP verify, 2FA)
│       │   └── firms/            # Law Firm authentication routes and IP checks
│       ├── citizen/
│       │   ├── chat/             # Citizen-scoped chat routing (Normal/Agentic) & sharing links
│       │   └── user/             # Profile management and user statistics
│       ├── document/             # General document template schema and template-based PDF gen routing
│       ├── translation/          # Multilingual translation controllers
│       └── lawyer/
│           ├── chat/             # Matter-contextualized Lawyer Chat routing and history management
│           ├── comms/            # Auto-generated client communications (WhatsApp, email scripts)
│           ├── contract/         # Contract review pipeline proxying
│           ├── document/         # Matter document upload, metadata, and versioning routing
│           ├── events/           # Hearing dates, deadlines scheduler, and event completion
│           ├── matter/           # Matter CRUD routing
│           └── workspace/        # Matter Workspace Memory view, manual updates, and regeneration
```

---

## 🌐 API Reference

### 1. Citizen Endpoints

#### `POST /api/auth/register`

Creates a standard citizen account.

```json
{
  "email": "citizen@gmail.com",
  "password": "Password123",
  "name": "Arjun Kumar"
}
```

#### `POST /api/auth/login`

Authenticates a citizen locally and returns authorization tokens.

- **Response**: `{ success: true, data: { user: {...}, accessToken: "...", refreshToken: "..." } }`

#### `POST /api/auth/google/firebase`

Authenticates a citizen using a Firebase Google ID token and returns authorization tokens.

```json
{
  "idToken": "firebase-google-id-token"
}
```

- **Response**: `{ success: true, data: { user: {...}, accessToken: "...", refreshToken: "..." } }`

#### `POST /api/chat/conversations`

Creates a standard user conversation.

```json
{
  "mode": "NORMAL", 
  "title": "Bail enquiry",
  "documentId": "document-uuid",
  "documentName": "contract.pdf"
}
```

#### `POST /api/chat/conversations/:conversationId/messages`

Send message to Citizen chat (Normal or Agentic mode). Optional file attachment support.

- **Request Body (Multipart)**: `message` (text), `mode` ("NORMAL"|"AGENTIC"), `file` (optional binary, max 10MB).

#### `POST /api/chat/conversations/:conversationId/share`

Generates a secure shared link.

```json
{
  "share": true
}
```

- **Response**: `{ success: true, data: { link: "http://localhost:3000/shared/hash-uuid" } }`

---

### 2. Lawyer Endpoints (`/api/lawyer`)

> 🔒 All Lawyer endpoints require a JWT token with `LAWYER` privileges passed as a `Bearer <token>` inside the `Authorization` Header.

#### `POST /api/lawyer/auth/register`

Lawyer registration. Bar number and phone will be encrypted.

```json
{
  "email": "advocate.sharma@legal.in",
  "password": "SecurePassword123",
  "name": "Rajesh Sharma",
  "phone": "9876543210",
  "barNumber": "MAH/9999/2020",
  "barCouncilState": "Maharashtra",
  "practiceAreas": ["Criminal", "Family Law"],
  "yearsOfExperience": 6
}
```

#### `POST /api/lawyer/auth/login`

Step 1: Starts lawyer authentication. Dispatches an OTP code to the registered email address.

- **Response**: `{ success: true, message: "OTP sent to email. Please verify 2FA." }`

#### `POST /api/lawyer/auth/google/firebase`

Authenticates or registers a lawyer using a Firebase Google ID token. If registering, profile details must be provided.

```json
{
  "idToken": "firebase-google-id-token",
  "phone": "9876543210",
  "barNumber": "MAH/9999/2020",
  "barCouncilState": "Maharashtra",
  "practiceAreas": ["Criminal"],
  "yearsOfExperience": 5
}
```

- **Response**: `{ success: true, data: { lawyer: {...}, accessToken: "...", refreshToken: "..." } }`

#### `POST /api/lawyer/auth/login/verify-2fa`

Step 2: Authenticates the lawyer via the OTP code.

```json
{
  "email": "advocate.sharma@legal.in",
  "otp": "123456"
}
```

- **Response**: `{ success: true, data: { accessToken: "...", refreshToken: "..." } }`

#### `POST /api/lawyer/matter`

Creates a matter/case workspace.

```json
{
  "title": "State of Maharashtra vs. Sharma",
  "caseNumber": "CC/123/2026",
  "court": "Bombay High Court",
  "practiceArea": "Criminal",
  "parties": [
    { "role": "Petitioner", "name": "State of Maharashtra" },
    { "role": "Respondent", "name": "Anil Sharma" }
  ],
  "notes": "Anticipatory bail petition filed under CrPC Section 438."
}
```

#### `POST /api/lawyer/chat/conversations/:conversationId/messages`

Sends a message scoped to a lawyer conversation. Automatically loads, format-validates, and injects the corresponding Matter Workspace Memory into the agentic query.

```json
{
  "message": "When is the next hearing, and what is our core legal argument?",
  "selectedDocId": "doc-uuid",
  "input_language": "en",
  "output_language": "hi"
}
```

#### `PATCH /api/lawyer/matter/:matterId/memory`

Manually edits a lawyer's case Workspace Memory fields.

```json
{
  "partySummary": "State of Maharashtra vs Anil Sharma",
  "factChronology": "2026-05-10: FIR registered; 2026-05-15: Anticipatory bail filed.",
  "legalIssues": "Jurisdiction of bail authority under section 438.",
  "keyDates": [
    { "label": "Next Hearing Date", "date": "2026-06-15" }
  ]
}
```

#### `POST /api/lawyer/matter/:matterId/memory/regenerate`

Triggers an asynchronous background request to regenerate the AI Summary of this matter based on the last 20 indexed case documents and recent chat conversations. Returns HTTP `202 Accepted`.

#### `POST /api/lawyer/matter/:matterId/documents`

Uploads case documents to a matter.

- **Request Body (Multipart)**: `file` (binary, max 20MB), `title` (string), `type` ("UPLOADED" | "EVIDENCE" | "ORDER" | "CORRESPONDENCE").

#### `POST /api/lawyer/comms/generate`

Generates WhatsApp/Email draft messages based on matter facts.

```json
{
  "matterId": "matter-uuid",
  "eventContext": "The court postponed the hearing to 2026-06-15 due to judge absence.",
  "clientName": "Anil Sharma",
  "format": "whatsapp",
  "outputLanguage": "hi"
}
```

#### `POST /api/lawyer/contract/review`

Uploads a contract and requests reviews.

- **Request Body (Multipart)**: `file` (binary), `mode` ("professional" | "client"), `saveToMatter` (true/false), `matterId` (optional).

---

### 3. Firm Endpoints (`/api/firm`)

> 🔒 Access requires a JWT token with `FIRM_ADMIN` privileges.

#### `POST /api/firm/auth/register`

Law Firm administrator registration.

```json
{
  "email": "admin@duttachambers.com",
  "password": "SecurePassword456",
  "name": "Subodh Dutta",
  "firmName": "Dutta Chambers",
  "phone": "9812345678",
  "registrationNumber": "FIRM/2026/001",
  "gstNumber": "27AAAAA1111A1Z1",
  "city": "Mumbai",
  "state": "Maharashtra"
}
```

- **Login Flow**: Follows a similar multi-step authentication process (`/login`, `/login/verify-2fa`) but enforces shorter session validation windows (4h) and tracks known IP addresses.

---

### 4. Template & Document Generation Endpoints

#### `GET /api/documents/templates`

Retrieves a list of available document templates.

- **Response**: `{ success: true, data: ["anticipatory_bail_petition", "affidavit", "rental_agreement"] }`

#### `POST /api/documents`

Generates a formatted draft based on a template and downloads it (supported types: `pdf`, `docx`, `txt`).

```json
{
  "template_name": "anticipatory_bail_petition",
  "data": {
    "accused_name": "Anil Sharma",
    "fir_number": "FIR/405/2026",
    "police_station": "Colaba Police",
    "ipc_sections": "IPC Section 406 and 420"
  },
  "format": "pdf"
}
```

---

## 🔒 Security Implementation Details

### 1. PII Cryptography (`encryption.service.ts`)

To adhere to legal data compliance, sensitive advocate and firm columns are encrypted at rest using **AES-256-GCM**:

- An `ENCRYPTION_KEY` environment variable (64-character hex string) is converted to a 32-byte cipher key.
- Encrypted strings are formatted as: `iv_base64:authTag_base64:ciphertext_base64`.
- Decryption validates the integrity of the auth tag, catching corruptions or key mismatches instantly.

### 2. Multi-Step OTP Authentication (`otp.service.ts`)

- OTP values are securely generated as 6-digit cryptographic numeric strings.
- Before saving to the database, OTPs are **bcrypt-hashed**.
- Verification compares hashes and enforces timeouts (typically 10 minutes) and max attempts (3) before invalidating the record.

---

## 📊 Key Technical Decisions

| Decision | Rationale |
|---|---|
| **Separate Citizen & Professional Models** | Citizen accounts remain lightweight (supporting Firebase Google Auth). Professional models (`LawyerUser` and `FirmUser`) isolate tables, restrict session times, require 2FA, and support AES-256-GCM encryption logic. |
| **Prisma + PostgreSQL** | Combines Postgres' robust transactional consistency with TypeScript-native, type-safe query building. |
| **Multer In-Memory Storage** | Avoids local storage overhead on ephemeral node containers (e.g. Render/HF Spaces), passing file buffers directly to downstream services. |
| **Upstash Redis Caching** | Prevents redundant downstream network requests for non-volatile metadata like legal document schemas or capabilities indexes. |
| **BFF Context Orchestrator** | Insulates the client from Python API changes. Handles schema mapping, language conversions, and dynamically attaches matter context on-the-fly. |

---

## 🔧 Configuration Reference

Create a `.env` file in the root directory. Below are the required environment variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/legalai?schema=public"

# Crypto Encryption Key (64-character hex string for AES-256-GCM)
ENCRYPTION_KEY="your-32-byte-hexadecimal-key-must-be-64-characters-long"

# JWT Auth Configuration
JWT_SECRET="your-jwt-auth-access-secret"
JWT_REFRESH_SECRET="your-jwt-auth-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Client CORS
FRONTEND_URL="http://localhost:3000"

# Python AI Backend Service Configuration
PYTHON_BACKEND_URL="http://localhost:8000"
PYTHON_BACKEND_TIMEOUT="180000" # 3 minutes for long RAG/Map-Reduce jobs

# Redis Caching (Upstash REST API)
UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-token"


# Global Rate Limiting
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🚀 Setup & Execution

### 1. Prerequisites

- **Node.js** (v20 or higher)
- **PostgreSQL** (Running instance)
- **Redis** (Upstash credentials or local server)
- Running **Python FastAPI Agentic Backend**

### 2. Quickstart

```bash
# Clone the repository
git clone https://github.com/AnuGuin/LegalAI_Backend.git
cd LegalAI_Backend

# Install packages
npm install

# Setup environment variables
cp .env.example .env
# Open .env and populate ENCRYPTION_KEY, DATABASE_URL, and PYTHON_BACKEND_URL

# Run database migrations
npx prisma migrate dev --name init

# Start the dev server
npm run dev
```

---

## 🧪 Testing

Test basic REST functionality or check health status:

```bash
# Gateway health check
curl http://localhost:3001/health

# Verify API validation & proxy setup
curl -X POST http://localhost:3001/api/translation/detect-language \
  -H "Content-Type: application/json" \
  -d '{"text": "कानून क्या है?"}'
```

---

## 📈 Roadmap

- [ ] **SSE / WebSocket Streaming Support**: Proxy token streams directly from Python to the client for typewriter-effect Q&A rendering.
- [ ] **Upstash Rate Limiting integration**: Move from local memory rate limiters to distributed IP limiters.
- [ ] **Audit Trail logging**: Implement structured ledger logging tracking document accesses, changes, and lawyer credentials queries.
- [ ] **Collaborative Matters**: Complete MatterMember invites implementation allowing multiple lawyers inside a firm to collaborate on a single matter.

---

## ⚠️ Disclaimer

Nyay Mitra is an AI-powered legal assistance gateway. It is designed to act as an assistant to lawyers and citizens for research and formatting aid. It does not provide legal advice, nor does it replace the guidance of a qualified legal advocate.

---

## 👨💻 Authors

- **Anubrata Guin** — Core BFF Architect, Express Framework, Prisma Schema & DB Management, Encryption & Auth System
- **Tejasvi Aryan** — AI & LangGraph Integration, Python Agent Client Handler

---

<div align="center">

⭐ Star this repository if you find it useful.

Made with ❤️ for modern legal professionals and Indian legal accessibility.

</div>
