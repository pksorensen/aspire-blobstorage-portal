# Troubleshooting Guide

Complete troubleshooting guide for the Azure Storage Explorer web application, covering common issues, error messages, and solutions.

## 📋 Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Configuration Issues](#configuration-issues)
3. [Connection Problems](#connection-problems)
4. [File Upload Issues](#file-upload-issues)
5. [Performance Issues](#performance-issues)
6. [UI/UX Issues](#uiux-issues)
7. [Deployment Issues](#deployment-issues)
8. [Debugging Tools](#debugging-tools)
9. [Common Error Messages](#common-error-messages)
10. [FAQ](#frequently-asked-questions)

## 🔍 Quick Diagnostics

### Health Check Steps

1. **Check Application Status:**
   ```bash
   npm run dev
   # Navigate to http://localhost:3000
   # Check if dashboard loads
   ```

2. **Verify Environment Variables:**
   ```bash
   echo $AZURE_STORAGE_CONNECTION_STRING
   # Should output your connection string
   ```

3. **Test Azure Storage Connection:**
   - Navigate to Dashboard
   - Check if storage metrics load
   - Look for connection errors in browser console

4. **Check Network Connectivity:**
   ```bash
   ping 127.0.0.1  # For emulator
   ping storage.blob.core.windows.net  # For Azure
   ```

### Browser Console Check

Open browser developer tools (F12) and check for:
- JavaScript errors in Console tab
- Failed network requests in Network tab
- 404/500 errors indicating configuration issues

## ⚙️ Configuration Issues

### Missing Azure Storage Configuration

**Symptoms:**
- Dashboard shows "Configuration Error"
- Error: "Azure Storage configuration missing"
- Application won't start

**Cause:**
Missing or invalid environment variables.

**Solution:**
```bash
# Check if environment variables are set
echo $AZURE_STORAGE_CONNECTION_STRING
echo $AZURE_STORAGE_ACCOUNT_NAME
echo $AZURE_STORAGE_ACCOUNT_KEY

# Create .env.local file with correct configuration
cat > .env.local << EOF
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=mykey;EndpointSuffix=core.windows.net"
EOF

# Restart the application
npm run dev
```

### Invalid Connection String Format

**Symptoms:**
- Error: "Invalid connection string format"
- Connection fails immediately

**Cause:**
Malformed connection string missing required components.

**Solution:**
Ensure connection string includes all required parts:
```bash
# Valid format:
DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=mykey;EndpointSuffix=core.windows.net

# For emulator:
DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;
```

### Invalid Storage Account Name

**Symptoms:**
- Error: "Invalid storage account name format"
- Authentication fails

**Cause:**
Storage account name doesn't meet Azure naming requirements.

**Solution:**
Verify account name follows Azure rules:
- 3-24 characters long
- Lowercase letters and numbers only
- Must start with letter or number
- No special characters except numbers

### Environment Variable Not Loading

**Symptoms:**
- Variables are set but application doesn't see them
- Works in development but not production

**Solutions:**

**Development (.env.local not loading):**
```bash
# Ensure file is in correct location
ls -la .env.local

# Check file contents
cat .env.local

# Restart development server
npm run dev
```

**Production (Environment variables not set):**
```bash
# For Docker
docker run -e AZURE_STORAGE_CONNECTION_STRING="..." myapp

# For Vercel
# Set environment variables in Vercel dashboard

# For Azure Static Web Apps
az staticwebapp appsettings set --name myapp --setting-names KEY=VALUE
```

## 🌐 Connection Problems

### Azure Storage Emulator Not Running

**Symptoms:**
- Connection errors in development
- "Connection refused" errors
- Dashboard shows no containers

**Cause:**
Azurite (Azure Storage Emulator) is not running.

**Solution:**
```bash
# Start Azurite with Docker
docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  mcr.microsoft.com/azure-storage/azurite

# Or with npm
npm install -g azurite
azurite-blob --location /tmp/azurite --debug /tmp/azurite/debug.log

# Verify emulator is running
curl http://127.0.0.1:10000/devstoreaccount1
```

### Network Connectivity Issues

**Symptoms:**
- Intermittent connection failures
- Slow loading times
- Timeouts

**Diagnosis:**
```bash
# Test connectivity to Azure Storage
nslookup youraccount.blob.core.windows.net
ping youraccount.blob.core.windows.net

# Test with curl
curl -I https://youraccount.blob.core.windows.net/
```

**Solutions:**
1. **Increase timeout values:**
   ```bash
   # In .env.local
   AZURE_STORAGE_TIMEOUT=60000  # 60 seconds
   AZURE_STORAGE_MAX_RETRIES=5
   ```

2. **Check firewall/proxy settings:**
   - Ensure port 443 (HTTPS) is open
   - Configure proxy if required
   - Check corporate firewall rules

3. **Use different endpoints:**
   ```bash
   # Try different Azure regions
   AZURE_STORAGE_BLOB_ENDPOINT=https://youraccount.blob.core.windows.net
   ```

### Authentication Failures

**Symptoms:**
- Error: "AuthenticationFailed"
- HTTP 403 Forbidden errors
- "Invalid signature" errors

**Causes & Solutions:**

**1. Invalid Account Key:**
```bash
# Regenerate keys in Azure Portal
# Go to Storage Account → Access Keys → Regenerate Key 1
# Update connection string with new key
```

**2. SAS Token Expired:**
```bash
# Generate new SAS token in Azure Portal
# Go to Storage Account → Shared Access Signature
# Set expiration date in future
# Update environment variable
```

**3. Clock Skew:**
```bash
# Ensure system clock is accurate
ntpdate -s time.nist.gov  # Linux/Mac
w32tm /resync  # Windows
```

### CORS Issues

**Symptoms:**
- CORS errors in browser console
- Requests blocked by browser
- Works in server but not client

**Solution:**
Configure CORS in Azure Storage Account:
```bash
# Using Azure CLI
az storage cors add \
  --account-name mystorageaccount \
  --services b \
  --methods GET POST PUT DELETE \
  --origins "http://localhost:3000" "https://mydomain.com" \
  --allowed-headers "*"
```

## 📁 File Upload Issues

### File Size Limit Exceeded

**Symptoms:**
- Error: "File size exceeds maximum allowed size"
- Upload stops or fails
- 413 Payload Too Large error

**Solutions:**
1. **Increase upload size limit:**
   ```bash
   # In .env.local
   AZURE_STORAGE_MAX_UPLOAD_SIZE=209715200  # 200MB
   ```

2. **Use chunked upload for large files:**
   ```typescript
   // For files > 100MB, consider using Azure SDK directly
   // with block upload for better performance
   ```

3. **Client-side file validation:**
   ```typescript
   function validateFile(file: File) {
     const maxSize = 100 * 1024 * 1024; // 100MB
     if (file.size > maxSize) {
       alert(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
       return false;
     }
     return true;
   }
   ```

### File Type Not Allowed

**Symptoms:**
- Error: "File type not allowed"
- Upload rejected before starting

**Solution:**
```bash
# Configure allowed file types
AZURE_STORAGE_ALLOWED_FILE_TYPES="jpg,png,pdf,docx,xlsx,txt"

# Or remove restriction to allow all file types
# (comment out or don't set AZURE_STORAGE_ALLOWED_FILE_TYPES)
```

### Upload Hangs or Times Out

**Symptoms:**
- Upload progress stops
- Browser shows "pending" request
- No error message

**Solutions:**
1. **Increase timeout:**
   ```bash
   AZURE_STORAGE_TIMEOUT=300000  # 5 minutes
   ```

2. **Check network stability:**
   ```bash
   # Test upload speed
   curl -T testfile.txt https://youraccount.blob.core.windows.net/container/test
   ```

3. **Try smaller files first:**
   - Upload a small test file
   - Gradually increase file size
   - Identify the breaking point

### Container Not Found

**Symptoms:**
- Error: "Container 'name' does not exist"
- Upload fails immediately

**Solution:**
```bash
# Create container first
curl -X PUT \
  -H "x-ms-blob-type: BlockBlob" \
  "https://youraccount.blob.core.windows.net/mycontainer?restype=container"

# Or use the application's create container feature
```

### Blob Name Conflicts

**Symptoms:**
- Upload seems successful but file not visible
- Overwrite warnings
- Unexpected behavior

**Solutions:**
1. **Use unique blob names:**
   ```typescript
   const uniqueName = `${Date.now()}-${file.name}`;
   ```

2. **Handle duplicates explicitly:**
   ```typescript
   // Check if blob exists before upload
   const exists = await azureStorage.blobExists(containerName, blobName);
   if (exists) {
     // Ask user for confirmation or auto-rename
   }
   ```

## 🐌 Performance Issues

### Slow Dashboard Loading

**Symptoms:**
- Dashboard takes > 5 seconds to load
- Storage metrics don't appear
- Page appears hung

**Diagnosis:**
```typescript
// Check browser developer tools Network tab
// Look for slow Azure Storage API calls
// Check server console for timing information
```

**Solutions:**
1. **Enable caching:**
   ```bash
   AZURE_STORAGE_ENABLE_CACHING=true
   AZURE_STORAGE_CACHE_TTL=300  # 5 minutes
   ```

2. **Reduce data fetching:**
   ```typescript
   // Limit initial data loading
   const containers = await listContainers(); // Only load containers initially
   // Load blob counts on demand
   ```

3. **Implement pagination:**
   ```bash
   # Limit results per request
   AZURE_STORAGE_DEFAULT_PAGE_SIZE=50
   ```

### Slow File Downloads

**Symptoms:**
- Downloads take much longer than expected
- Download speeds < 1 MB/s
- Browser hangs during download

**Solutions:**
1. **Use signed URLs:**
   ```typescript
   // Generate direct download URLs instead of streaming through server
   const downloadUrl = await generateBlobDownloadUrl(containerName, blobName);
   window.open(downloadUrl);
   ```

2. **Check Azure region:**
   ```bash
   # Use storage account in same region as users
   # Consider multiple storage accounts for global distribution
   ```

3. **Optimize network path:**
   ```bash
   # Use Azure CDN for frequently downloaded content
   # Enable Azure Storage static website hosting for direct access
   ```

### Memory Issues

**Symptoms:**
- Browser becomes unresponsive
- High memory usage
- Crashes on large file operations

**Solutions:**
1. **Implement streaming:**
   ```typescript
   // Avoid loading entire files into memory
   // Use ReadableStream for large file operations
   ```

2. **Limit concurrent operations:**
   ```bash
   AZURE_STORAGE_MAX_CONCURRENT_UPLOADS=3  # Reduce from default
   ```

3. **Add memory monitoring:**
   ```typescript
   // Monitor memory usage in browser
   if (performance.memory.usedJSHeapSize > 100 * 1024 * 1024) {
     console.warn('High memory usage detected');
   }
   ```

## 🎨 UI/UX Issues

### Sidebar Not Responsive

**Symptoms:**
- Sidebar doesn't collapse on mobile
- Layout breaks on small screens
- Navigation not accessible

**Solutions:**
1. **Check CSS media queries:**
   ```css
   @media (max-width: 768px) {
     .sidebar { display: none; }
     .mobile-menu { display: block; }
   }
   ```

2. **Verify component props:**
   ```typescript
   <SidebarProvider defaultCollapsed={isMobile}>
     <AppSidebar />
   </SidebarProvider>
   ```

### Dark Mode Not Working

**Symptoms:**
- Theme toggle doesn't work
- Inconsistent styling
- Flash of wrong theme

**Solutions:**
1. **Check theme provider:**
   ```typescript
   // Ensure ThemeProvider wraps the app
   <ThemeProvider defaultTheme="system">
     <App />
   </ThemeProvider>
   ```

2. **Verify CSS variables:**
   ```css
   :root {
     --background: 0 0% 100%;
     --foreground: 222.2 84% 4.9%;
   }
   
   .dark {
     --background: 222.2 84% 4.9%;
     --foreground: 210 40% 98%;
   }
   ```

### Loading States Not Showing

**Symptoms:**
- No loading indicators
- Sudden content appearance
- Poor user experience

**Solutions:**
1. **Add Suspense boundaries:**
   ```typescript
   <Suspense fallback={<LoadingSkeleton />}>
     <StorageMetricsCards />
   </Suspense>
   ```

2. **Implement loading states:**
   ```typescript
   const [isLoading, setIsLoading] = useState(true);
   
   useEffect(() => {
     loadData().finally(() => setIsLoading(false));
   }, []);
   ```

### Form Validation Not Working

**Symptoms:**
- Invalid data submitted
- No error messages
- Form submits with empty fields

**Solutions:**
1. **Check validation schemas:**
   ```typescript
   const schema = z.object({
     name: z.string().min(3).max(63),
     publicAccess: z.enum(['none', 'blob', 'container'])
   });
   ```

2. **Verify error handling:**
   ```typescript
   const [errors, setErrors] = useState({});
   
   const handleSubmit = async (data) => {
     try {
       await schema.parseAsync(data);
       // Submit form
     } catch (error) {
       setErrors(error.flatten().fieldErrors);
     }
   };
   ```

## 🚀 Deployment Issues

### Build Failures

**Symptoms:**
- `npm run build` fails
- TypeScript compilation errors
- Missing dependencies

**Common Solutions:**

**1. TypeScript Errors:**
```bash
# Check for type errors
npm run type-check

# Fix common issues
# - Missing type definitions
# - Incorrect imports
# - Props interface mismatches
```

**2. Missing Dependencies:**
```bash
# Install missing packages
npm install

# Check for peer dependency warnings
npm ls
```

**3. Environment Variables in Build:**
```bash
# Ensure build-time variables are set
AZURE_STORAGE_CONNECTION_STRING="..." npm run build
```

### Deployment Configuration Issues

**Vercel Deployment:**
```bash
# Check vercel.json configuration
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}

# Verify environment variables in Vercel dashboard
```

**Docker Deployment:**
```dockerfile
# Check Dockerfile for correct paths
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
```

### Runtime Errors in Production

**Symptoms:**
- Works locally but fails in production
- 500 Internal Server Error
- Missing environment variables

**Diagnosis:**
1. **Check deployment logs:**
   ```bash
   # Vercel
   vercel logs

   # Docker
   docker logs container-name

   # Azure Container Apps
   az containerapp logs show --name myapp --resource-group myrg
   ```

2. **Verify environment variables:**
   ```bash
   # Test environment variable loading
   console.log('Connection string loaded:', !!process.env.AZURE_STORAGE_CONNECTION_STRING);
   ```

### SSL/TLS Certificate Issues

**Symptoms:**
- HTTPS errors
- Certificate warnings
- Mixed content warnings

**Solutions:**
1. **Force HTTPS:**
   ```typescript
   // next.config.js
   module.exports = {
     async headers() {
       return [
         {
           source: '/(.*)',
           headers: [
             {
               key: 'Strict-Transport-Security',
               value: 'max-age=31536000; includeSubDomains'
             }
           ]
         }
       ];
     }
   };
   ```

2. **Update Azure Storage endpoints:**
   ```bash
   # Ensure using HTTPS endpoints
   AZURE_STORAGE_BLOB_ENDPOINT=https://youraccount.blob.core.windows.net
   ```

## 🛠️ Debugging Tools

### Browser Developer Tools

**Console Debugging:**
```typescript
// Enable debug logging
localStorage.setItem('debug', 'azure-storage:*');

// Monitor network requests
console.log('API call started:', { url, method, body });

// Track performance
console.time('operation');
// ... operation code ...
console.timeEnd('operation');
```

**Network Tab:**
- Check for failed requests (4xx, 5xx status codes)
- Monitor request/response sizes
- Verify correct headers are sent

### Server-side Debugging

**Application Logging:**
```typescript
// Enable detailed logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('Azure Storage Config:', {
    hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    // Don't log sensitive data in production
  });
}
```

**Azure Storage Logs:**
```bash
# Enable Azure Storage logging in Azure Portal
# Go to Storage Account → Monitoring → Diagnostic Settings
# Enable blob, queue, table, and file logging
```

### Testing Tools

**Connection Testing:**
```bash
# Test Azure Storage connectivity
curl -I https://youraccount.blob.core.windows.net/

# Test specific container
curl -I https://youraccount.blob.core.windows.net/mycontainer?restype=container

# Test with authentication
curl -H "Authorization: Bearer $SAS_TOKEN" \
  https://youraccount.blob.core.windows.net/mycontainer
```

**Load Testing:**
```bash
# Test upload performance
for i in {1..10}; do
  curl -X PUT -T testfile$i.txt \
    https://youraccount.blob.core.windows.net/container/testfile$i.txt
done
```

## ❌ Common Error Messages

### "Container 'name' already exists"

**Cause:** Trying to create a container that already exists.

**Solutions:**
1. Use a different container name
2. Check if container exists first
3. Use the existing container

### "The specified resource does not exist"

**Cause:** Trying to access a non-existent container or blob.

**Solutions:**
1. Verify container/blob name spelling
2. Check if resource was deleted
3. Create the resource if needed

### "AuthenticationFailed: Server failed to authenticate the request"

**Cause:** Invalid credentials or expired authentication.

**Solutions:**
1. Verify connection string/account key
2. Check SAS token expiration
3. Regenerate access keys if needed

### "InvalidResourceName: The specified resource name contains invalid characters"

**Cause:** Resource name violates Azure naming rules.

**Solutions:**
1. Use only allowed characters (alphanumeric, hyphens)
2. Ensure name meets length requirements
3. Follow Azure naming conventions

### "RequestBodyTooLarge: The request body is too large"

**Cause:** Upload exceeds size limits.

**Solutions:**
1. Reduce file size
2. Use chunked upload for large files
3. Increase size limits in configuration

### "InternalError: The server encountered an internal error"

**Cause:** Temporary Azure Storage service issue.

**Solutions:**
1. Retry the operation
2. Check Azure service status
3. Wait and try again later

## ❓ Frequently Asked Questions

### General Questions

**Q: Why is the application slow?**
A: Check caching configuration, Azure region proximity, and network connectivity. Enable caching and use appropriate cache TTL values.

**Q: Can I use this with Azure Storage accounts in different regions?**
A: Yes, but performance may vary based on distance. Consider using a storage account closest to your users.

**Q: Is this secure for production use?**
A: Yes, when properly configured. All Azure credentials remain server-side, and the application supports proper authentication methods.

**Q: Can I customize the UI theme?**
A: Yes, the application uses shadcn/ui components with full theming support. Modify CSS variables or component styles as needed.

### Configuration Questions

**Q: What's the difference between connection string and account key?**
A: Connection string includes all necessary information (protocol, account name, key, endpoints). Account key requires separate configuration of account name and endpoint.

**Q: Should I use SAS tokens or account keys?**
A: SAS tokens are more secure as they can have limited permissions and expiration times. Use them when possible, especially for client-side access.

**Q: How do I configure for development vs. production?**
A: Use different environment files (.env.local for dev, environment variables for production) with appropriate storage accounts and configurations.

### Feature Questions

**Q: Can I upload files larger than 100MB?**
A: The default limit is 100MB, but you can increase it via environment variables. For very large files, consider using Azure SDK directly with block upload.

**Q: Does the application support blob versioning?**
A: The application can display blob versions if enabled on your storage account, but doesn't provide versioning management features.

**Q: Can I manage multiple storage accounts?**
A: Currently, the application supports one storage account per deployment. For multiple accounts, deploy separate instances.

### Technical Questions

**Q: Why are there no API routes?**
A: This application uses Next.js Server Actions exclusively for better performance, security, and simplification. All mutations happen server-side.

**Q: How does caching work?**
A: The application uses Next.js built-in caching with tags for granular invalidation. Cache is automatically invalidated when data changes.

**Q: Is the application accessible?**
A: Yes, the application includes accessibility features like keyboard navigation, ARIA labels, and screen reader support.

**Q: Can I extend the application with custom features?**
A: Yes, the modular architecture makes it easy to add new components and features. Follow the existing patterns for consistency.

## 🆘 Getting Additional Help

### Documentation Resources
- [Environment Configuration](./environment-configuration.md) - Setup and configuration
- [User Guide](./user-guide.md) - Feature usage
- [Deployment Guide](./deployment-guide.md) - Production deployment
- [API Reference](./api-reference.md) - Technical documentation

### External Resources
- [Azure Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/)
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

### Support Channels
- **GitHub Issues** - Bug reports and feature requests
- **Azure Support** - Azure Storage account issues
- **Community Forums** - General questions and discussions

### Reporting Issues

When reporting issues, please include:
1. **Environment details** (OS, browser, Node.js version)
2. **Configuration** (sanitized, no secrets)
3. **Steps to reproduce** the issue
4. **Expected vs. actual behavior**
5. **Error messages** from console/logs
6. **Browser developer tools** screenshots if relevant

---

**Still having issues?** Create a GitHub issue with detailed information, and the community will help troubleshoot your specific problem.