# Discovery Questions

Based on the design screenshots analysis, here are the key discovery questions to understand the Azure Storage Explorer-style application requirements:

## Q1: Will this application need to connect to real Azure Storage accounts or just the local emulator?
**Default if unknown:** Both (production apps typically support both local development and cloud deployment)

The design shows authentic Azure Storage URLs like "stmcweuprd.queue.core.windows.net" suggesting it should work with real Azure Storage accounts, while the project has an emulator for development.

## Q2: Should the application handle authentication for accessing Azure Storage accounts?
**Default if unknown:** Yes (storage accounts require authentication as shown in the screenshots)

The screenshots show "Authentication method: Access key" and options to "Switch to Microsoft Entra user account", indicating authentication is required.

## Q3: Will users need to upload and download files through the web interface?
**Default if unknown:** Yes (core functionality shown in action toolbars)

The screenshots show "Upload" buttons prominently displayed in the container and blob management interfaces.

## Q4: Should the application support all Azure Storage services (Blobs, File shares, Tables, Queues)?
**Default if unknown:** Yes (all services are shown in the navigation and dashboard)

The design shows comprehensive coverage of all major Azure Storage services with dedicated sections and metrics for each.

## Q5: Will the application need to display real-time storage metrics and usage statistics?
**Default if unknown:** Yes (dashboard shows detailed metrics for each service)

The main dashboard displays metrics cards showing counts, data stored, and other statistics for each storage service type.