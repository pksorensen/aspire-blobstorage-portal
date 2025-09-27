# Azure Storage Explorer - Web Application

A comprehensive Azure Storage Explorer-style web application built with **Next.js 15**, **React Server Components**, and the **Azure Storage SDK**. This application provides a modern, responsive interface for managing Azure Blob Storage containers and blobs with zero API routes and 100% server-side data fetching.

## 🚀 Features

- **Dashboard** - Live storage metrics, container/blob counts, and recently viewed items
- **Container Management** - Create, delete, and manage blob containers
- **Blob Operations** - Upload, download, delete, and manage blob properties
- **Advanced Features** - Access tier management, metadata editing, batch operations
- **Search & Filtering** - Global search with advanced filtering options
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Real-time Updates** - Server-side caching with automatic revalidation
- **Accessibility** - Full keyboard navigation and screen reader support

## 🏗️ Architecture

This application uses a **100% React Server Components architecture** with:

- **Zero API Routes** - All data fetching happens in Server Components
- **Server Actions** - All mutations handled server-side with automatic revalidation
- **Azure SDK Integration** - Direct Azure Storage SDK calls in server components
- **Next.js 15** - App Router with Turbopack for faster builds
- **shadcn/ui** - Modern, accessible UI components
- **TypeScript** - End-to-end type safety

## 📋 Prerequisites

- **Node.js** 18.17 or later
- **npm** 9.0 or later
- **Azure Storage Account** with connection string or account credentials

## 🚀 Quick Start

### 1. Clone and Navigate

```bash
cd src/blob-storage-management
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the project root:

```bash
# Azure Storage Configuration (Required)
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=your-account;AccountKey=your-key;EndpointSuffix=core.windows.net"

# Optional Configuration
AZURE_STORAGE_ENABLE_CACHING=true
AZURE_STORAGE_CACHE_TTL=60
AZURE_STORAGE_MAX_UPLOAD_SIZE=104857600
AZURE_STORAGE_MAX_CONCURRENT_UPLOADS=3
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## 📚 Documentation

- [📖 User Guide](./docs/user-guide.md) - Complete feature walkthrough
- [🔧 Environment Configuration](./docs/environment-configuration.md) - Detailed setup guide
- [🚀 Deployment Guide](./docs/deployment-guide.md) - Production deployment instructions
- [🔗 API Reference](./docs/api-reference.md) - Server Actions documentation
- [❓ Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production with Turbopack
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking

# Testing
npm run test         # Run Playwright tests
npm run test:ui      # Run tests with UI
npm run test:debug   # Debug tests
npm run test:report  # View test reports
```

### Project Structure

```
src/blob-storage-management/
├── app/                      # Next.js App Router
│   ├── dashboard/           # Dashboard page
│   ├── containers/          # Container management
│   │   └── [containerName]/ # Individual container pages
│   └── search/             # Global search
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── blobs/             # Blob-specific components
│   └── containers/        # Container-specific components
├── lib/                   # Utilities and integrations
│   ├── azure-storage.ts   # Azure SDK wrapper
│   ├── azure-actions.ts   # Server Actions
│   └── utils.ts          # Helper utilities
├── types/                # TypeScript definitions
└── tests/               # Playwright test suites
```

## 🔧 Technology Stack

### Core Technologies
- **Next.js 15.5.2** - React framework with App Router
- **React 19.1.0** - UI library with Server Components
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Styling framework
- **@azure/storage-blob** - Azure Storage SDK

### UI Components
- **shadcn/ui** - Component library (New York style)
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library
- **class-variance-authority** - Component variants

### Development Tools
- **Turbopack** - Fast bundler for development and builds
- **Playwright** - End-to-end testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 🌟 Key Features

### Dashboard
- Real-time storage metrics (containers, blobs, total size)
- Recently viewed containers and blobs
- Quick access to management features
- Storage account information

### Container Management
- Create new containers with public access settings
- Delete containers with confirmation
- Browse container contents
- Container favorites system
- Advanced search and filtering

### Blob Operations
- File upload with drag-and-drop support
- Secure file downloads with signed URLs
- Batch operations (delete multiple blobs)
- Blob metadata viewing and editing
- Access tier management (Hot/Cool/Archive)
- Copy/paste operations between containers

### Advanced Features
- Global search across all containers and blobs
- Advanced filtering (size, date, content type, access tier)
- Blob lease management
- Properties panel with detailed information
- Comprehensive error handling
- Accessibility features (keyboard navigation, ARIA labels)

## 🔒 Security

- **Server-side Only** - All Azure credentials remain on the server
- **Environment Variables** - Secure configuration management
- **Signed URLs** - Secure blob downloads
- **Input Validation** - Comprehensive data validation
- **Error Sanitization** - Safe error messages for client

## 📊 Performance

- **Server-side Caching** - Intelligent caching with Next.js built-in features
- **Streaming** - Progressive page rendering with Suspense
- **Optimized Bundles** - Turbopack for fast builds and hot reloads
- **Lazy Loading** - Components and resources loaded on demand
- **Edge Runtime** - Optional deployment to edge functions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is part of the Aspire Blob Storage sample and follows the same licensing terms.

## 🆘 Support

- [Troubleshooting Guide](./docs/troubleshooting.md)
- [GitHub Issues](https://github.com/your-repo/issues)
- [Azure Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/)

---

Built with ❤️ using Next.js 15, React Server Components, and Azure Storage SDK.