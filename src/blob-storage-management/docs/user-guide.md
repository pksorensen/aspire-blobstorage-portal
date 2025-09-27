# Azure Storage Explorer - User Guide

A complete guide to using the Azure Storage Explorer web application for managing your Azure Blob Storage containers and files.

## 📖 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Container Management](#container-management)
4. [Blob Operations](#blob-operations)
5. [Advanced Features](#advanced-features)
6. [Search and Filtering](#search-and-filtering)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Tips and Tricks](#tips-and-tricks)

## 🚀 Getting Started

### First Launch

After configuring your environment variables and starting the application, you'll be automatically redirected to the **Dashboard** page. This is your main hub for managing Azure Storage.

### Main Navigation

The application uses a collapsible sidebar navigation with the following sections:

- **Dashboard** - Overview and metrics
- **Containers** - Container management
- **Search** - Global search functionality
- **Other Management** - Additional storage features

Click the sidebar toggle (☰) to collapse or expand the navigation panel.

## 📊 Dashboard Overview

The Dashboard provides a comprehensive overview of your Azure Storage account:

### Storage Metrics Cards

**Containers Card:**
- Total number of containers in your storage account
- Quick access to container management
- Real-time count updates

**Blobs Card:**
- Total number of blobs across all containers
- Storage usage information
- Performance metrics

**Other Services Card:**
- Additional Azure Storage services
- Quick links to management features

### Recently Viewed Section

The **Recently Viewed** section shows:
- Recently accessed containers
- Recently viewed blobs
- Quick navigation to previous work
- Automatic history tracking

### Quick Actions

- **Browse Containers** - Navigate to container listing
- **Search Everything** - Access global search
- **Upload Files** - Quick file upload (when in a container)

## 📂 Container Management

### Viewing Containers

Navigate to **Containers** from the sidebar to view all containers in your storage account.

**Container List Features:**
- Container name and creation date
- Public access level indicator
- Blob count and total size
- Last modified timestamp
- Metadata indicators

### Creating a Container

1. Click **"Create Container"** button
2. Enter a container name (3-63 characters, lowercase, numbers, hyphens)
3. Select public access level:
   - **Private** - No public access (recommended)
   - **Blob** - Public read access for blobs only
   - **Container** - Public read access for container and blobs
4. Add optional metadata (key-value pairs)
5. Click **"Create Container"**

**Container Naming Rules:**
- 3-63 characters long
- Start with letter or number
- Lowercase letters, numbers, and hyphens only
- No consecutive hyphens
- Cannot end with hyphen

### Container Actions

**Available Actions:**
- **Browse** - View container contents
- **Delete** - Remove container (with confirmation)
- **Add to Favorites** - Quick access bookmark
- **Copy Name** - Copy container name to clipboard
- **View Properties** - Detailed container information

### Favorites System

Mark frequently used containers as favorites:
1. Click the star icon (⭐) next to a container name
2. Favorited containers appear at the top of the list
3. Access favorites quickly from the dashboard

## 📁 Blob Operations

### Viewing Blobs

Click on any container to view its contents. The blob listing shows:

- **File name** with folder-like organization
- **File size** in human-readable format
- **Content type** (MIME type)
- **Last modified** timestamp
- **Access tier** (Hot/Cool/Archive)
- **Metadata** indicator

### Virtual Folders

The application creates a folder-like view using blob name prefixes:
- Blobs with `/` in names create virtual folders
- Navigate folders by clicking folder names
- Breadcrumb navigation shows current path

### Uploading Files

**Single File Upload:**
1. Click **"Upload File"** button
2. Select file from your computer
3. Choose destination folder (optional)
4. Set access tier (Hot/Cool/Archive)
5. Add metadata (optional)
6. Click **"Upload"**

**Drag & Drop Upload:**
1. Drag files from your computer
2. Drop them onto the blob listing area
3. Files upload automatically with default settings

**Upload Options:**
- **Access Tier:**
  - **Hot** - Frequent access, higher storage cost
  - **Cool** - Infrequent access, lower storage cost
  - **Archive** - Rarely accessed, lowest cost
- **Content Type** - Automatically detected or manually set
- **Metadata** - Custom key-value pairs

### Downloading Files

**Single File Download:**
1. Click the download icon (⬇️) next to any blob
2. File downloads through your browser
3. Large files use secure signed URLs

**Bulk Download:**
1. Select multiple files using checkboxes
2. Click **"Download Selected"**
3. Files download as individual files or zip archive

### File Management

**Copying Files:**
1. Select one or more blobs
2. Click **"Copy"** in the action toolbar
3. Navigate to destination container
4. Click **"Paste"**

**Moving Files:**
1. Select blobs to move
2. Click **"Cut"** or **"Move"**
3. Navigate to destination
4. Click **"Paste"**

**Deleting Files:**
1. Select blobs to delete
2. Click **"Delete"** (trash icon)
3. Confirm deletion in the modal dialog
4. Files are permanently removed

**Bulk Operations:**
- Select multiple files using checkboxes
- Use **"Select All"** to select all visible files
- Bulk actions: Delete, Change Access Tier, Add Metadata

## 🔧 Advanced Features

### Access Tier Management

Change storage costs by managing access tiers:

1. Select one or more blobs
2. Click **"Change Access Tier"**
3. Choose new tier:
   - **Hot** - $0.0184/GB (frequent access)
   - **Cool** - $0.01/GB (30+ day storage)
   - **Archive** - $0.00099/GB (180+ day storage)
4. Confirm changes

**Note:** Archive tier files need rehydration before access (can take hours).

### Metadata Management

Add custom metadata to containers and blobs:

**For Containers:**
1. Click container properties icon
2. Navigate to **"Metadata"** tab
3. Add key-value pairs
4. Click **"Save Changes"**

**For Blobs:**
1. Click blob name to open properties panel
2. Navigate to **"Metadata"** section
3. Add, edit, or remove metadata
4. Changes save automatically

**Metadata Best Practices:**
- Use descriptive keys (e.g., `department`, `project`, `author`)
- Values are case-sensitive strings
- Metadata is searchable
- Use for organization and filtering

### Blob Properties

View detailed blob information:

**Properties Include:**
- **Basic Info** - Size, type, creation date
- **Access Info** - Tier, last access time
- **Security** - ETag, MD5 hash
- **Lease Info** - Lease status and duration
- **Custom Metadata** - User-defined properties

### Copy and Paste Operations

**Between Containers:**
1. Select blobs in source container
2. Click **"Copy"** or press `Ctrl+C`
3. Navigate to destination container
4. Click **"Paste"** or press `Ctrl+V`
5. Choose copy options:
   - **Preserve metadata** - Keep original metadata
   - **Access tier** - Set tier for copies
   - **Overwrite existing** - Replace existing blobs

### Batch Operations

Perform operations on multiple files efficiently:

**Batch Delete:**
- Select up to 256 files
- Batch operations for optimal performance
- Progress tracking for large batches

**Batch Property Changes:**
- Change access tier for multiple blobs
- Add metadata to multiple files
- Set content type for file groups

## 🔍 Search and Filtering

### Global Search

Access global search from the sidebar or press `Ctrl+K`:

**Search Features:**
- **Cross-container search** - Search all containers at once
- **Real-time results** - Search as you type
- **Recent searches** - Quick access to previous searches
- **Search history** - Persistent search history

### Advanced Filtering

Use advanced filters to find specific content:

**Filter Options:**
- **Name pattern** - Use wildcards (* and ?)
- **Content type** - MIME type filtering
- **File size** - Min/max size ranges
- **Date range** - Modified date filtering
- **Access tier** - Hot/Cool/Archive
- **Metadata** - Search by custom metadata
- **Tags** - Azure blob tags (if enabled)

**Filter Examples:**
```
Name: *.pdf              # All PDF files
Size: 1MB - 10MB         # Files between 1-10 MB
Modified: Last 7 days    # Recently modified files
Type: image/*            # All image files
Tier: Archive            # Archived files
```

### Quick Filters

Pre-defined filters for common searches:
- **Recent files** - Modified in last 24 hours
- **Large files** - Files over 100 MB
- **Images** - Image file types
- **Documents** - Document file types
- **Archives** - Compressed files

## ⌨️ Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|---------|
| `Ctrl + K` | Open global search |
| `Ctrl + /` | Show keyboard shortcuts |
| `Esc` | Close modals/panels |
| `F5` | Refresh current page |

### Navigation

| Shortcut | Action |
|----------|---------|
| `Ctrl + 1` | Go to Dashboard |
| `Ctrl + 2` | Go to Containers |
| `Ctrl + 3` | Go to Search |
| `←` `→` | Navigate breadcrumbs |

### Selection and Actions

| Shortcut | Action |
|----------|---------|
| `Ctrl + A` | Select all items |
| `Ctrl + D` | Deselect all |
| `Space` | Toggle item selection |
| `Enter` | Open/download selected |
| `Delete` | Delete selected items |

### File Operations

| Shortcut | Action |
|----------|---------|
| `Ctrl + C` | Copy selected items |
| `Ctrl + X` | Cut selected items |
| `Ctrl + V` | Paste items |
| `Ctrl + U` | Upload file |
| `Ctrl + D` | Download selected |

### Accessibility

The application supports full keyboard navigation:
- Tab through interactive elements
- Arrow keys for list navigation
- Enter/Space for activation
- Screen reader announcements
- High contrast mode support

## 💡 Tips and Tricks

### Performance Optimization

**For Large Containers:**
- Use search/filtering instead of scrolling through all items
- Enable pagination for containers with 1000+ blobs
- Use prefix-based virtual folders for organization

**For File Uploads:**
- Upload multiple small files in batches
- Use appropriate access tiers to save costs
- Consider using Azure Storage SDK directly for very large files (>100MB)

### Organization Best Practices

**Container Naming:**
- Use descriptive names: `website-assets`, `user-documents`
- Include environment: `prod-images`, `dev-backups`
- Follow consistent naming conventions

**File Organization:**
- Use folder-like prefixes: `images/thumbnails/`, `docs/2024/`
- Include dates in blob names: `backup-2024-03-15.zip`
- Use metadata for additional categorization

**Access Tier Strategy:**
- **Hot** - Active website assets, frequently accessed files
- **Cool** - Backup files, logs, infrequently accessed content
- **Archive** - Long-term retention, compliance documents

### Cost Management

**Monitor Storage Costs:**
- Review access tier usage regularly
- Move old files to cooler tiers
- Delete unnecessary duplicates and test files
- Use lifecycle management policies (configure in Azure Portal)

**Optimize for Access Patterns:**
- Analyze blob access logs
- Move rarely accessed files to Cool tier
- Consider Archive tier for long-term retention
- Use metadata to track file importance

### Security Best Practices

**Access Control:**
- Use private containers by default
- Enable public access only when necessary
- Regularly review and rotate access keys
- Use SAS tokens for limited-time access

**Data Management:**
- Add metadata for data classification
- Use consistent naming for easier policy application
- Regular cleanup of temporary files
- Monitor access patterns for anomalies

### Troubleshooting Common Issues

**Slow Performance:**
- Check internet connection
- Clear browser cache
- Use filters to reduce data loading
- Check Azure Storage account region

**Upload Failures:**
- Verify file size is under 100MB limit
- Check file permissions
- Ensure container exists and is accessible
- Try uploading one file at a time

**Access Denied:**
- Verify Azure Storage configuration
- Check connection string/credentials
- Ensure storage account is accessible
- Review firewall and network settings

## 🆘 Getting Help

### In-App Help

- **Error Messages** - Detailed error information with suggestions
- **Tooltips** - Hover over icons for quick help
- **Loading States** - Progress indicators for long operations
- **Confirmation Dialogs** - Clear action descriptions

### Additional Resources

- [Troubleshooting Guide](./troubleshooting.md) - Common issues and solutions
- [Environment Configuration](./environment-configuration.md) - Setup and configuration
- [API Reference](./api-reference.md) - Technical documentation
- [Azure Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/)

### Support Channels

- GitHub Issues for bug reports
- Documentation for feature questions
- Azure Support for storage account issues

---

**Need more help?** Check the [Troubleshooting Guide](./troubleshooting.md) or open an issue on GitHub.