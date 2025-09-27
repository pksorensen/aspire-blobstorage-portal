# Discovery Answers

## Q1: Will this application need to connect to real Azure Storage accounts or just the local emulator?
**Answer:** No - Focus on the Next.js application for storage account management, not the Aspire emulator integration.

## Q2: Should the application handle authentication for accessing Azure Storage accounts?
**Answer:** No - Users will provide connection strings as environment variables and handle security through their own firewall/security layers.

## Q3: Will users need to upload and download files through the web interface?
**Answer:** Yes - Upload and download functionality is a core feature to be implemented.

## Q4: Should the application support all Azure Storage services (Blobs, File shares, Tables, Queues)?
**Answer:** No - Focus on blob storage first, other services can be added later.

## Q5: Will the application need to display real-time storage metrics and usage statistics?
**Answer:** Yes - Simple metrics displayed via React Server Components querying the storage account directly.