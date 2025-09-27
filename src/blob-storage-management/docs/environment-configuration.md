# Environment Configuration Guide

This guide covers all environment variables and configuration options for the Azure Storage Explorer web application.

## 📋 Configuration Overview

The application uses environment variables for configuration, with support for multiple authentication methods and deployment scenarios.

## 🔑 Azure Storage Authentication

### Method 1: Connection String (Recommended)

The easiest way to configure Azure Storage access is using a connection string:

```bash
# .env.local
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=mykey;EndpointSuffix=core.windows.net"
```

**Finding your connection string:**
1. Navigate to your Azure Storage Account in the Azure Portal
2. Go to **Security + networking** → **Access keys**
3. Copy the connection string from Key 1 or Key 2

### Method 2: Account Name + Key

```bash
# .env.local
AZURE_STORAGE_ACCOUNT_NAME="myaccount"
AZURE_STORAGE_ACCOUNT_KEY="mykey"
AZURE_STORAGE_BLOB_ENDPOINT="https://myaccount.blob.core.windows.net" # Optional
```

### Method 3: Account Name + SAS Token

```bash
# .env.local
AZURE_STORAGE_ACCOUNT_NAME="myaccount"
AZURE_STORAGE_SAS_TOKEN="sv=2021-06-08&ss=bfqt&srt=sco&sp=rwdlacupx..."
AZURE_STORAGE_BLOB_ENDPOINT="https://myaccount.blob.core.windows.net" # Optional
```

### Method 4: Azure Storage Emulator (Development)

For local development, you can use Azurite (Azure Storage Emulator):

```bash
# .env.local - Development with Azurite
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
```

**Starting Azurite:**
```bash
# Using Docker
docker run -p 10000:10000 mcr.microsoft.com/azure-storage/azurite:latest azurite-blob --blobHost 0.0.0.0

# Or using npm
npm install -g azurite
azurite-blob --location /tmp/azurite --debug /tmp/azurite/debug.log
```

## ⚙️ Application Configuration

### Performance & Caching

```bash
# .env.local

# Enable/disable caching (default: true)
AZURE_STORAGE_ENABLE_CACHING=true

# Cache TTL in seconds (default: 60)
AZURE_STORAGE_CACHE_TTL=60

# Connection timeout in milliseconds (default: 30000)
AZURE_STORAGE_TIMEOUT=30000

# Max retry attempts (default: 3)
AZURE_STORAGE_MAX_RETRIES=3

# Retry delay in milliseconds (default: 1000)
AZURE_STORAGE_RETRY_DELAY=1000
```

### File Upload Settings

```bash
# .env.local

# Max upload size in bytes (default: 104857600 = 100MB)
AZURE_STORAGE_MAX_UPLOAD_SIZE=104857600

# Max concurrent uploads (default: 3)
AZURE_STORAGE_MAX_CONCURRENT_UPLOADS=3

# Allowed file types (optional, comma-separated)
AZURE_STORAGE_ALLOWED_FILE_TYPES="image/jpeg,image/png,application/pdf,text/plain"
```

### Monitoring & Telemetry

```bash
# .env.local

# Enable telemetry (default: false)
AZURE_STORAGE_ENABLE_TELEMETRY=false
```

## 🌍 Environment-Specific Configuration

### Development (.env.local)

```bash
# Development environment
NODE_ENV=development

# Azure Storage - Use Azurite for local development
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"

# Development-specific settings
AZURE_STORAGE_ENABLE_CACHING=true
AZURE_STORAGE_CACHE_TTL=30
AZURE_STORAGE_ENABLE_TELEMETRY=true
```

### Staging (.env.staging)

```bash
# Staging environment
NODE_ENV=production

# Azure Storage - Use dedicated staging storage account
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=mystaging;AccountKey=stagingkey;EndpointSuffix=core.windows.net"

# Staging-specific settings
AZURE_STORAGE_ENABLE_CACHING=true
AZURE_STORAGE_CACHE_TTL=60
AZURE_STORAGE_MAX_UPLOAD_SIZE=52428800  # 50MB for staging
AZURE_STORAGE_ENABLE_TELEMETRY=true
```

### Production (.env.production)

```bash
# Production environment
NODE_ENV=production

# Azure Storage - Use production storage account
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=myprod;AccountKey=prodkey;EndpointSuffix=core.windows.net"

# Production-specific settings
AZURE_STORAGE_ENABLE_CACHING=true
AZURE_STORAGE_CACHE_TTL=300  # 5 minutes
AZURE_STORAGE_MAX_UPLOAD_SIZE=104857600  # 100MB
AZURE_STORAGE_MAX_CONCURRENT_UPLOADS=5
AZURE_STORAGE_ENABLE_TELEMETRY=false  # Disable for privacy
```

## 🔐 Security Best Practices

### Environment Variable Security

1. **Never commit secrets** to version control
2. **Use different storage accounts** for different environments
3. **Rotate keys regularly** in production
4. **Use SAS tokens** when possible for limited access
5. **Enable Azure Storage logging** for audit trails

### Access Control

```bash
# Use SAS tokens with limited permissions
# Example: Read-only SAS token for production
AZURE_STORAGE_SAS_TOKEN="sv=2021-06-08&ss=b&srt=co&sp=r&se=2024-12-31T23:59:59Z&st=2024-01-01T00:00:00Z&spr=https&sig=..."
```

### Network Security

```bash
# Use private endpoints in production
AZURE_STORAGE_BLOB_ENDPOINT="https://myaccount.privatelink.blob.core.windows.net"
```

## 🚀 Cloud Deployment Configuration

### Vercel

```bash
# Vercel environment variables (set in Vercel Dashboard)
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_ENABLE_CACHING=true
AZURE_STORAGE_CACHE_TTL=300
```

### Azure Static Web Apps

```json
// staticwebapp.config.json
{
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block"
  },
  "env": {
    "AZURE_STORAGE_CONNECTION_STRING": "YOUR_CONNECTION_STRING"
  }
}
```

### Docker

```dockerfile
# Dockerfile environment variables
ENV AZURE_STORAGE_CONNECTION_STRING=""
ENV AZURE_STORAGE_ENABLE_CACHING=true
ENV AZURE_STORAGE_CACHE_TTL=300
ENV NODE_ENV=production
```

### Azure Container Apps

```yaml
# container-app.yaml
properties:
  template:
    containers:
    - name: azure-storage-explorer
      env:
      - name: AZURE_STORAGE_CONNECTION_STRING
        secretRef: azure-storage-connection-string
      - name: AZURE_STORAGE_ENABLE_CACHING
        value: "true"
      - name: AZURE_STORAGE_CACHE_TTL
        value: "300"
```

## 🧪 Configuration Validation

The application includes built-in configuration validation:

```typescript
// lib/config.ts includes validation for:
// - Required environment variables
// - Connection string format
// - Storage account name format
// - Numeric value ranges
// - Boolean value parsing
```

### Testing Configuration

```bash
# Test your configuration
npm run dev

# The application will show detailed error messages if configuration is invalid
# Check the console for validation warnings and errors
```

## 📊 Configuration Monitoring

### Health Check Endpoint

The application includes connection health monitoring:

```typescript
// Available through the Azure Storage service
const health = await azureStorage.getConnectionHealth();
console.log({
  isHealthy: health.isHealthy,
  lastChecked: health.lastChecked,
  error: health.error
});
```

### Configuration Info

Get sanitized configuration information:

```typescript
// Safe for client-side logging (secrets excluded)
const configInfo = azureStorage.getConfigInfo();
console.log(configInfo);
```

## 🆘 Troubleshooting Configuration

### Common Issues

1. **"Missing Azure Storage authentication" Error**
   - Ensure you have set either `AZURE_STORAGE_CONNECTION_STRING` or both `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_ACCOUNT_KEY`

2. **"Invalid connection string format" Error**
   - Verify your connection string includes `DefaultEndpointsProtocol`, `AccountName`, and `AccountKey`

3. **"Invalid storage account name format" Error**
   - Storage account names must be 3-24 characters, lowercase letters and numbers only

4. **Connection timeouts**
   - Increase `AZURE_STORAGE_TIMEOUT` value
   - Check network connectivity to Azure

5. **Slow performance**
   - Enable caching with `AZURE_STORAGE_ENABLE_CACHING=true`
   - Adjust `AZURE_STORAGE_CACHE_TTL` as needed

### Debug Configuration

```bash
# Enable development mode for detailed logging
NODE_ENV=development
npm run dev

# The application will log configuration warnings and connection status
```

## 📋 Configuration Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure production Azure Storage connection
- [ ] Set appropriate cache TTL values
- [ ] Configure upload size limits
- [ ] Test connection health
- [ ] Verify all required environment variables
- [ ] Review security settings
- [ ] Test file upload/download operations
- [ ] Monitor application logs for configuration warnings

## 🔗 Additional Resources

- [Azure Storage Account Documentation](https://docs.microsoft.com/en-us/azure/storage/common/storage-account-overview)
- [Azure Storage Security Guide](https://docs.microsoft.com/en-us/azure/storage/common/storage-security-guide)
- [Azurite Documentation](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azurite)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)