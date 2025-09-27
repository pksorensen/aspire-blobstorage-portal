# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a hybrid project containing both a .NET Aspire application and a Next.js frontend for blob storage management:

### .NET Aspire Application (samples/BlobStorageEmulator/)
The purpose of this is a sample to show how this project can be used.


- **AppHost Project**: `BlobStorageEmulator.AppHost` - Main orchestration using Aspire 9.4.1
- **ServiceDefaults**: `BlobStorageEmulator.ServiceDefaults` - Shared configuration for OpenTelemetry, health checks, and service discovery
- **Azure Storage Integration**: Uses Azure Storage emulator with blob storage support
- **Target Framework**: .NET 9.0 with nullable reference types enabled

### Next.js Frontend (src/blob-storage-management/)
The management UI that can be used to manage the blob storage account 
- **Framework**: Next.js 15.5.2 with React 19.1.0 and TypeScript
- **Styling**: Tailwind CSS v4 with shadcn/ui components (New York style)
- **Build Tool**: Turbopack for faster builds
- **Component Library**: shadcn/ui with Lucide React icons

## Key Files and Structure

- `samples/BlobStorageEmulator/BlobStorageEmulator.AppHost/AppHost.cs`: Main Aspire orchestration - defines Azure Storage emulator and blob services
- `samples/BlobStorageEmulator/BlobStorageEmulator.ServiceDefaults/Extensions.cs`: Shared service configuration including OpenTelemetry setup
- `src/blob-storage-management/components.json`: shadcn/ui configuration with path aliases
- `src/blob-storage-management/app/`: Next.js App Router structure

## Development Commands

### .NET Aspire Application
```bash
# Build and run the Aspire application
cd samples/BlobStorageEmulator
aspire run

# Build solution
dotnet build BlobStorageEmulator.sln
```

### Next.js Frontend
```bash
# Navigate to frontend directory
cd src/blob-storage-management

# Install dependencies
npm install

# Start development server with Turbopack
npm run dev

# Build for production with Turbopack
npm run build

# Start production server
npm run start
```

## Technology Stack

### .NET Components
- .NET 9.0
- Aspire 9.4.1 (AppHost SDK, Azure Storage hosting)
- OpenTelemetry with OTLP exporter
- Microsoft.Extensions.Http.Resilience for HTTP resilience
- Azure Storage Emulator integration

### Frontend Components  
- Next.js 15.5.2 with App Router
- React 19.1.0
- TypeScript 5
- Tailwind CSS v4 with PostCSS
- shadcn/ui component library
- Lucide React icons
- Class Variance Authority for component variants

## Path Aliases (Next.js)
- `@/components` → `./components`
- `@/lib` → `./lib` 
- `@/utils` → `./lib/utils`
- `@/ui` → `./components/ui`
- `@/hooks` → `./hooks`