# Swarm Execution Plan: Azure Storage Explorer Web Application

## Objective
Build a comprehensive Azure Storage Explorer-style web application using Next.js 15 with 100% React Server Components architecture and zero API routes. The application will provide blob storage management capabilities including container management, file upload/download, storage metrics visualization, and advanced blob features using direct Azure SDK integration in server components and Server Actions for mutations.

## Acceptance Criteria
- [ ] Dashboard displaying live storage metrics (container count, blob count, data stored)
- [ ] Container listing with search, create, and delete operations
- [ ] Blob listing within containers showing file details, metadata, and access tiers
- [ ] File upload functionality using Server Actions (single files <100MB)
- [ ] File download functionality with signed URLs
- [ ] shadcn/ui dashboard sidebar with collapsible navigation sections
- [ ] Recently viewed containers/blobs tracking
- [ ] Favorites system for frequently accessed containers
- [ ] Responsive design working on desktop and mobile
- [ ] Environment variable configuration for Azure Storage connection string
- [ ] Blob metadata display and editing capabilities
- [ ] Access tier management (Hot/Cool/Archive)
- [ ] Copy/paste operations between containers
- [ ] Comprehensive error handling and loading states

## Agent Sequence

### Phase 1: Foundation & Architecture (Sequential)
1. **playwright-nextjs-test-architect**
   - Role: Design comprehensive test strategy following TDD London school
   - Tasks: 
     - Create acceptance test structure for all user flows
     - Define test interfaces and mocks for Azure Storage operations
     - Design page object patterns for blob storage UI
     - Set up Playwright test configuration for Next.js App Router
   - Output: Test strategy document, initial test files, Playwright configuration
   - Dependencies: None

2. **react-rsc-engineer** 
   - Role: Design RSC architecture with direct Azure SDK integration
   - Tasks:
     - Design pure RSC + Server Actions architecture (zero API routes)
     - Create Azure Storage SDK wrapper for server components
     - Define Server Action patterns for all mutations
     - Design component structure (RSC vs Client Components)
   - Output: Architecture design, Azure integration patterns, component specifications
   - Dependencies: Test strategy from playwright-nextjs-test-architect

### Phase 2: Dependencies & Core Infrastructure (Sequential)
3. **general-purpose**
   - Role: Configure dependencies and project setup for existing Next.js project
   - Tasks:
     - Add @azure/storage-blob SDK to existing project (`src/blob-storage-management/`)
     - Configure shadcn/ui components (already partially configured)
     - Set up environment variables for Azure Storage connection
     - Validate existing project structure matches requirements
     - Update package.json with required dependencies
   - Output: Updated dependencies, environment configuration, validated project structure
   - Dependencies: Architecture design from react-rsc-engineer
   - **Note**: Next.js 15 project already exists at `src/blob-storage-management/`

4. **react-rsc-engineer**
   - Role: Implement Azure Storage SDK wrapper and Server Actions
   - Tasks:
     - Create `src/blob-storage-management/lib/azure-storage.ts` with direct SDK integration for RSCs
     - Implement `src/blob-storage-management/lib/azure-actions.ts` with all mutation Server Actions
     - Add TypeScript interfaces in `src/blob-storage-management/types/azure-types.ts`
     - Set up proper error handling and connection management
   - Output: Azure Storage integration layer, Server Actions, type definitions
   - Dependencies: Dependencies configuration from general-purpose

### Phase 3: Core UI Foundation (Sequential)
5. **shadcn-component-engineer**
   - Role: Set up shadcn/ui dashboard layout and sidebar in existing project
   - Tasks:
     - Add required shadcn/ui components to `src/blob-storage-management/`
     - Create dashboard layout with collapsible sidebar navigation
     - Implement breadcrumb navigation system
     - Set up responsive design patterns
     - Create base UI components (loading, error boundaries, search)
   - Output: Dashboard layout, sidebar navigation, base UI components
   - Dependencies: Dependencies configuration and Azure integration

6. **react-rsc-engineer**
   - Role: Build storage metrics dashboard (RSC) in existing project
   - Tasks:
     - Update `src/blob-storage-management/app/page.tsx` with direct Azure SDK calls
     - Implement metrics cards showing container/blob counts and storage usage
     - Add recently viewed items functionality
     - Set up proper caching and revalidation strategies
   - Output: Dashboard page with live metrics, recently viewed functionality
   - Dependencies: UI foundation and Azure integration

### Phase 4: Container Management (Parallel Group A)
Can run in parallel:

7. **react-rsc-engineer** - Container Listing & Display
   - Role: Implement container listing with RSC in existing project
   - Tasks:
     - Create `src/blob-storage-management/app/containers/page.tsx` with direct `listContainers()` calls
     - Implement container search and filtering components
     - Add container metadata display components
     - Set up container navigation and breadcrumbs
   - Output: Container listing page, search functionality, container details
   - Dependencies: Dashboard foundation

8. **react-client-component-dev** - Container Actions
   - Role: Build container management client components in existing project
   - Tasks:
     - Create container creation form with Server Actions in `src/blob-storage-management/components/containers/`
     - Implement container deletion with confirmation modal
     - Add favorites system for containers
     - Build container action toolbar
   - Output: Container CRUD operations, favorites system, interactive components
   - Dependencies: Container listing foundation

### Phase 5: Blob Management Core (Parallel Group B)
Can run in parallel:

9. **react-rsc-engineer** - Blob Listing & Display
   - Role: Implement blob listing with RSC in existing project
   - Tasks:
     - Create `src/blob-storage-management/app/containers/[containerName]/page.tsx` with direct `listBlobs()` calls
     - Display blob metadata, access tiers, and properties
     - Implement virtual directory structure from blob prefixes
     - Add blob search and filtering capabilities
   - Output: Blob listing page, metadata display, directory navigation
   - Dependencies: Container management completion

10. **react-client-component-dev** - Blob Actions & Upload
    - Role: Build blob operation client components in existing project
    - Tasks:
      - Create file upload component with Server Actions in `src/blob-storage-management/components/blobs/`
      - Implement blob download with signed URL generation
      - Add blob deletion with confirmation
      - Build blob action toolbar with copy/paste operations
    - Output: File upload/download, blob CRUD operations, action toolbar
    - Dependencies: Blob listing foundation

### Phase 6: Advanced Features (Parallel Group C)
Can run in parallel:

11. **react-client-component-dev** - Advanced Blob Features
    - Role: Implement advanced blob management features in existing project
    - Tasks:
      - Add access tier management (Hot/Cool/Archive) components in `src/blob-storage-management/components/blobs/`
      - Create blob metadata editing interface
      - Implement copy/paste operations between containers
      - Add blob properties and lease information display
    - Output: Advanced blob features, metadata management, cross-container operations
    - Dependencies: Core blob management completion

12. **react-rsc-engineer** - Search & Filtering Enhancement
    - Role: Enhance search and filtering across the existing application
    - Tasks:
      - Implement global search functionality in existing layout
      - Add advanced filtering options to existing pages
      - Create search result pages with RSC
      - Optimize search performance with proper caching
    - Output: Global search, advanced filtering, optimized search performance
    - Dependencies: Core functionality completion

### Phase 7: Testing & Quality Assurance (Sequential)
13. **playwright-nextjs-test-architect**
    - Role: Implement comprehensive test suite for existing project
    - Tasks:
      - Set up Playwright testing in `src/blob-storage-management/` project
      - Write end-to-end tests for all user flows
      - Create integration tests for Azure Storage operations
      - Add accessibility and responsive design tests
      - Configure test automation for the existing Next.js project
    - Output: Complete test suite, CI/CD integration, test reports
    - Dependencies: All core functionality completed

### Phase 8: Polish & Documentation (Parallel Group D)
Can run in parallel:

14. **general-purpose** - Performance Optimization
    - Role: Optimize existing application performance and error handling
    - Tasks:
      - Implement proper loading states and Suspense boundaries in existing components
      - Add comprehensive error boundaries and user-friendly error messages
      - Optimize RSC caching strategies for the existing application
      - Add performance monitoring and analytics
    - Output: Optimized performance, robust error handling, monitoring
    - Dependencies: Complete functionality

15. **general-purpose** - Documentation & Deployment
    - Role: Create comprehensive documentation for existing project
    - Tasks:
      - Write setup and configuration documentation for `src/blob-storage-management/`
      - Create user guides for blob storage management features
      - Add deployment instructions for various environments
      - Document environment variable configuration and Azure Storage setup
    - Output: Complete documentation, deployment guides, user manuals
    - Dependencies: Complete functionality

## Execution Notes
- Total estimated phases: 8
- Maximum parallel agents: 3 (Groups A, B, C, D)
- Critical path: playwright-test-architect → react-rsc-engineer → shadcn-component-engineer → core functionality → testing
- Risk areas: Azure SDK integration complexity, file upload handling, RSC caching strategies
- **Architecture Focus**: 100% RSC + Server Actions with zero API routes
- **Performance Priority**: Direct Azure SDK calls in RSCs for optimal performance

## Dynamic Agents Required
None - All required agents are available as standard agent types.

## Feedback Integration
This is a new swarm based on comprehensive requirements specification.

### Key Technical Decisions:
- **Pure RSC Architecture**: No API routes, direct Azure SDK integration in server components
- **Server Actions Only**: All mutations handled through Server Actions with automatic revalidation  
- **shadcn/ui Foundation**: New York style components for professional UI
- **TypeScript End-to-End**: Full type safety without API boundaries
- **Environment Variable Security**: Connection strings never exposed to client
- **Modern Next.js Patterns**: App Router, Suspense, streaming, and caching optimization

## Special Considerations
- **Existing Project**: Next.js 15 project already exists at `src/blob-storage-management/` with shadcn/ui partially configured
- **File Upload Strategy**: Use Server Actions with multipart/form-data handling (no API routes)
- **Download Strategy**: Server Actions generate signed URLs for secure downloads
- **Caching Strategy**: Leverage Next.js built-in RSC caching with `revalidatePath()` for mutations
- **Error Handling**: Comprehensive error boundaries with Azure-specific error messages
- **Testing Strategy**: Focus on user flows and Azure Storage integration testing within existing project structure
- **Security**: All Azure operations server-side only, environment variable configuration
- **Project Structure**: All implementation work happens within the existing `src/blob-storage-management/` directory