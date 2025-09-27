# Expert Technical Questions

Based on deep codebase analysis and Azure Storage research, here are the critical implementation questions:

## Q6: Should we implement the Azure Storage client in a server-side lib/azure-storage.ts wrapper?
**Default if unknown:** Yes (follows Next.js best practices and keeps connection strings secure)

The pattern would create a centralized Azure SDK wrapper at `lib/azure-storage.ts` that handles BlobServiceClient initialization using the connection string from environment variables, providing clean methods for container/blob operations.

## Q7: Will the application need to support file uploads larger than 100MB requiring chunked upload?
**Default if unknown:** No (most web applications handle smaller files, chunking adds complexity)

Azure Storage supports block uploads up to 5TB, but implementing chunked/resumable uploads requires additional UI complexity, progress tracking, and error handling for large files.

## Q8: Should blob listings use React Server Components with direct Azure SDK calls for better performance?
**Default if unknown:** Yes (RSC reduces client bundle size and provides faster initial loads)

The existing Next.js 15 setup with App Router supports RSC perfectly. Blob/container listings could be server-rendered with Azure SDK calls in RSC, while only file upload remains client-side.

## Q9: Will users need to manage blob metadata and access tiers (Hot/Cool/Archive) as shown in the screenshots?
**Default if unknown:** No (advanced features can be added later, focus on core CRUD first)

The screenshots show "Access tier" and "Blob type" columns, but these are advanced Azure Storage features. Starting with basic upload/download/delete operations is more practical.

## Q10: Should the navigation sidebar match the exact structure from the screenshots with collapsible sections?
**Default if unknown:** Yes (maintains consistency with Azure Storage Explorer UX that users expect)

The screenshots show a specific navigation pattern with "Blob containers" expandable to show individual containers, plus sections for "Recently viewed" and "Favorites" - this UX is familiar to Azure Storage users.