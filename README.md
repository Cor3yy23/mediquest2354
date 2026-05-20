# MediQuest Midterm Demo

## Prerequisites
- .NET SDK 10+
- Node.js LTS
- PostgreSQL (local)

## Local backend config
Create `backend/MediQuest.Api/appsettings.Development.json` (local only):

```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=mediquest;Username=postgres;Password=YOUR_PASSWORD"
  },
  "Auth": {
    "Issuer": "MediQuest",
    "Audience": "MediQuestUsers",
    "SigningKey": "dev-signing-key-change-me-1234567890-abcdefghijklmnopqrstuvwxyz",
    "AccessTokenMinutes": 60
  },
  "Epic": {
    "ClientId": "YOUR_EPIC_CLIENT_ID",
    "FhirBaseUrl": "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    "RedirectUri": "http://localhost:5173/callback",
    "Scopes": "launch/patient openid profile patient/Patient.read patient/MedicationRequest.read offline_access"
  }
}
```

## Run backend
```bash
cd backend/MediQuest.Api
dotnet restore
dotnet ef database update
dotnet run
```

## Run frontend
```bash
cd frontend
npm install
npm run dev
```
Open: `http://localhost:5173`

## Midterm demo flow
1. Register/login in UI (`admin1` can be created as username/email exactly `admin1`).
2. Admin creates party.
3. Register/login as member and have admin add member by email.
4. Member imports meds from Epic (`/api/epic/authorize` -> callback -> `/api/epic/import/medications`) or manually adds med in UI.
5. Member submits claim (`/api/claims`).
6. Admin opens pending claims and approves/denies.
7. Member checks progression (`/api/progression/me`) for level/rank/xp/unlocks.
8. Open leaderboard (`/api/leaderboard`).
9. Login as `admin1` and use `/api/admin/grant-xp` for fast-forward demo.

## Implemented endpoints
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Epic: `/api/epic/authorize`, `/api/epic/callback`, `/api/epic/import/medications`
- Medications: `/api/medications` (GET, POST)
- Parties: `/api/parties`, `/api/parties/me`, `/api/parties/{id}`, `/api/parties/{id}/members`, `/api/parties/{id}/members/{memberId}`
- Claims/XP: `/api/claims`, `/api/claims/mine`, `/api/claims/pending`, `/api/claims/{id}/approve`, `/api/claims/{id}/deny`
- Progression: `/api/progression/me`, `/api/leaderboard`
- Admin1 only: `/api/admin/grant-xp`, `/api/admin/unlock-all`

## How to test checklist (Swagger + frontend)
- In Swagger: register -> login -> Authorize JWT -> call `/api/auth/me`.
- In frontend: login and create party.
- Add med and submit claim as member.
- Approve claim as party owner and verify XP increases.
- Verify level/rank/unlocks from `/api/progression/me`.
- Verify leaderboard sorting from `/api/leaderboard`.
- Verify non-admin1 cannot call `/api/admin/grant-xp`.
