# MediQuest Repository Structure

## Overview

This repository contains a full-stack health gamification application with a C# ASP.NET Core backend, TypeScript frontend, and React Native mobile app.

## Directory Organization

```
mediquest2354/
├── backend/
│   ├── MediQuest.Api/
│   │   ├── Controllers/          # API endpoints
│   │   ├── Models/               # Domain entities
│   │   ├── Services/             # Business logic
│   │   ├── Contracts/            # DTOs and request/response objects
│   │   ├── Data/                 # Database context and migrations
│   │   ├── Program.cs            # Application startup
│   │   └── MediQuest.Api.csproj
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   └── Capstone.sln
│
├── frontend/                      # React TypeScript web app
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── config files (tsconfig, vite, tailwind, eslint)
│
├── mobile/
│   └── MediQuestMobile/          # React Native mobile app
│
├── db/                           # Database scripts/migrations
│
└── docs/                         # Documentation

```

## Key Files

### Backend Structure

- **Controllers/**: Handle HTTP requests and responses
  - `AdminController.cs` - Admin operations (grant XP, unlock items)
  - `AuthController.cs` - Authentication and user registration
  - `DosesController.cs` - Medication dose tracking
  - `MedicationsController.cs` - Medication management
  - `PartiesController.cs` - Family/group management
  - `QuestsController.cs` - Quest/activity management
  - `ProgressionController.cs` - User progression and cosmetics
  - `NotificationsController.cs` - Notifications
  - `StatsController.cs` - Statistics and analytics
  - `PhysicalTherapyTasksController.cs` - PT exercises
  - `EpicController.cs` - Epic EHR integration

- **Models/**: Domain entities
  - `AppUser.cs` - Extended identity user
  - `Medication.cs`, `DoseClaim.cs`, `DoseLog.cs`
  - `Party.cs`, `PartyMember.cs`
  - `Quest.cs`, `QuestProgress.cs`
  - `Notification.cs`
  - `PhysicalTherapyTask.cs`
  - `UnlockDefinition.cs`, `UserUnlock.cs`

- **Services/**: Business logic
  - `ProgressionService.cs` - XP and level progression
  - `NotificationService.cs` - Notification handling
  - `DoseService.cs` - Dose tracking logic
  - `JwtTokenService.cs` - JWT token generation
  - `EpicSmartService.cs` - Epic integration

- **Contracts/**: Request/response DTOs
  - `MedicationContracts.cs`
  - `NotificationContracts.cs`
  - `PartyContracts.cs`
  - `PhysicalTherapyContracts.cs`
  - `ProgressionContracts.cs`

- **Data/**: Database layer
  - `AppDbContext.cs` - Entity Framework Core DbContext
  - Migrations/ - Database schema versions

### Frontend

- Modern TypeScript/React setup with Vite
- Tailwind CSS for styling
- ESLint for code quality

### Mobile

- React Native application
- Located in `MediQuestMobile/` folder

## Naming Conventions

- **C# Files**: PascalCase (e.g., `AdminController.cs`)
- **TypeScript Files**: camelCase (e.g., `authService.ts`)
- **Folders**: kebab-case for organizational folders (e.g., `api-helpers/`)
- **Database Migrations**: Timestamp format (e.g., `20260302230334_InitialCreate.cs`)

## Configuration Files

- `appsettings.json` - Production configuration
- `appsettings.Development.json` - Development configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `vite.config.ts` - Vite build configuration
- `eslint.config.js` - ESLint rules
- `Capstone.sln` - Visual Studio solution file

## Building and Running

### Backend

```bash
cd backend
cd MediQuest.Api
dotnet run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Database

Entity Framework Core migrations are located in `MediQuest.Api/Data/Migrations/`

```bash
cd backend/MediQuest.Api
dotnet ef database update
```
