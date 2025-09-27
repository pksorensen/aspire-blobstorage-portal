# Deployment Guide

This guide covers deploying the Azure Storage Explorer web application to various production environments.

## 📋 Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] Azure Storage account is properly configured
- [ ] Environment variables are set for target environment
- [ ] Application builds successfully (`npm run build`)
- [ ] Tests pass (`npm run test`)
- [ ] Security review completed
- [ ] Performance optimization completed
- [ ] Monitoring and logging configured

## 🌐 Deployment Options

## Vercel (Recommended)

Vercel provides the best experience for Next.js applications with zero-config deployment.

### Automatic Deployment (Git Integration)

1. **Connect Repository:**
   ```bash
   # Push your code to GitHub/GitLab/Bitbucket
   git push origin main
   ```

2. **Import Project in Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Connect your repository
   - Select the `src/blob-storage-management` directory as the root

3. **Configure Environment Variables:**
   ```bash
   # In Vercel Dashboard → Settings → Environment Variables
   AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=..."
   AZURE_STORAGE_ENABLE_CACHING = "true"
   AZURE_STORAGE_CACHE_TTL = "300"
   AZURE_STORAGE_MAX_UPLOAD_SIZE = "104857600"
   ```

4. **Deploy:**
   - Vercel automatically builds and deploys
   - Get your production URL: `https://your-app.vercel.app`

### Manual Deployment (Vercel CLI)

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to project directory
cd src/blob-storage-management

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add AZURE_STORAGE_CONNECTION_STRING production
vercel env add AZURE_STORAGE_ENABLE_CACHING production
```

### Vercel Configuration

Create `vercel.json` in the project root:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "functions": {
    "app/**/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## Azure Static Web Apps

Deploy directly to Azure for tight integration with Azure Storage.

### Azure CLI Deployment

1. **Install Azure CLI:**
   ```bash
   # Install Azure CLI
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   
   # Login to Azure
   az login
   ```

2. **Create Resource Group:**
   ```bash
   az group create \
     --name rg-azure-storage-explorer \
     --location "East US"
   ```

3. **Create Static Web App:**
   ```bash
   az staticwebapp create \
     --name azure-storage-explorer \
     --resource-group rg-azure-storage-explorer \
     --location "East US2" \
     --source https://github.com/your-username/your-repo \
     --branch main \
     --app-location "src/blob-storage-management" \
     --output-location ".next"
   ```

4. **Configure App Settings:**
   ```bash
   az staticwebapp appsettings set \
     --name azure-storage-explorer \
     --setting-names \
     AZURE_STORAGE_CONNECTION_STRING="your-connection-string" \
     AZURE_STORAGE_ENABLE_CACHING="true" \
     AZURE_STORAGE_CACHE_TTL="300"
   ```

### GitHub Actions Configuration

Create `.github/workflows/azure-static-web-apps.yml`:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
    paths:
      - 'src/blob-storage-management/**'
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main
    paths:
      - 'src/blob-storage-management/**'

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'src/blob-storage-management/package-lock.json'

      - name: Install dependencies
        run: npm ci
        working-directory: src/blob-storage-management

      - name: Build application
        run: npm run build
        working-directory: src/blob-storage-management

      - name: Deploy to Azure Static Web Apps
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "src/blob-storage-management"
          output_location: ".next"
```

## Netlify

Deploy to Netlify with continuous integration.

### Netlify Configuration

1. **Connect Repository:**
   - Visit [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your repository

2. **Build Settings:**
   ```bash
   # Build command
   cd src/blob-storage-management && npm run build
   
   # Publish directory
   src/blob-storage-management/.next
   ```

3. **Environment Variables:**
   ```bash
   # In Netlify Dashboard → Site Settings → Environment Variables
   AZURE_STORAGE_CONNECTION_STRING = "your-connection-string"
   AZURE_STORAGE_ENABLE_CACHING = "true"
   AZURE_STORAGE_CACHE_TTL = "300"
   ```

Create `netlify.toml` in the repository root:

```toml
[build]
  base = "src/blob-storage-management"
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## Docker Deployment

Containerize the application for flexible deployment.

### Dockerfile

Create `Dockerfile` in `src/blob-storage-management`:

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set environment variables
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  azure-storage-explorer:
    build: 
      context: src/blob-storage-management
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AZURE_STORAGE_CONNECTION_STRING=${AZURE_STORAGE_CONNECTION_STRING}
      - AZURE_STORAGE_ENABLE_CACHING=true
      - AZURE_STORAGE_CACHE_TTL=300
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Build and Deploy

```bash
# Build the image
docker build -t azure-storage-explorer src/blob-storage-management

# Run container
docker run -d \
  --name azure-storage-explorer \
  -p 3000:3000 \
  -e AZURE_STORAGE_CONNECTION_STRING="your-connection-string" \
  azure-storage-explorer

# Using Docker Compose
docker-compose up -d
```

## Azure Container Apps

Deploy containerized application to Azure Container Apps.

### Azure Container Apps Deployment

```bash
# Create Container Apps environment
az containerapp env create \
  --name azure-storage-explorer-env \
  --resource-group rg-azure-storage-explorer \
  --location "East US"

# Deploy container app
az containerapp create \
  --name azure-storage-explorer \
  --resource-group rg-azure-storage-explorer \
  --environment azure-storage-explorer-env \
  --image your-registry.azurecr.io/azure-storage-explorer:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    AZURE_STORAGE_CONNECTION_STRING=secretref:azure-storage-connection-string \
    AZURE_STORAGE_ENABLE_CACHING=true \
    AZURE_STORAGE_CACHE_TTL=300

# Add secret for connection string
az containerapp secret set \
  --name azure-storage-explorer \
  --resource-group rg-azure-storage-explorer \
  --secrets azure-storage-connection-string="your-connection-string"
```

## Kubernetes

Deploy to any Kubernetes cluster.

### Kubernetes Manifests

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: azure-storage-explorer
  labels:
    app: azure-storage-explorer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: azure-storage-explorer
  template:
    metadata:
      labels:
        app: azure-storage-explorer
    spec:
      containers:
      - name: azure-storage-explorer
        image: azure-storage-explorer:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: AZURE_STORAGE_CONNECTION_STRING
          valueFrom:
            secretKeyRef:
              name: azure-storage-secret
              key: connection-string
        - name: AZURE_STORAGE_ENABLE_CACHING
          value: "true"
        - name: AZURE_STORAGE_CACHE_TTL
          value: "300"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: azure-storage-explorer-service
spec:
  selector:
    app: azure-storage-explorer
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
---
apiVersion: v1
kind: Secret
metadata:
  name: azure-storage-secret
type: Opaque
data:
  connection-string: <base64-encoded-connection-string>
```

Deploy to Kubernetes:

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app=azure-storage-explorer
kubectl get services azure-storage-explorer-service
```

## 🔧 Production Configuration

### Environment Variables for Production

```bash
# Required
AZURE_STORAGE_CONNECTION_STRING="your-production-connection-string"

# Performance
AZURE_STORAGE_ENABLE_CACHING=true
AZURE_STORAGE_CACHE_TTL=300  # 5 minutes
AZURE_STORAGE_TIMEOUT=30000  # 30 seconds

# Upload limits
AZURE_STORAGE_MAX_UPLOAD_SIZE=104857600  # 100MB
AZURE_STORAGE_MAX_CONCURRENT_UPLOADS=5

# Security
NODE_ENV=production

# Optional monitoring
AZURE_STORAGE_ENABLE_TELEMETRY=false  # Set based on privacy requirements
```

### Next.js Production Optimizations

Add to `next.config.ts`:

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // For Docker deployments
  experimental: {
    turbo: {
      loaders: {
        '.svg': ['@svgr/webpack'],
      },
    },
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

## 📊 Monitoring and Observability

### Health Check Endpoint

The application includes built-in health monitoring through the Azure Storage connection health check.

### Application Insights (Azure)

Add Application Insights for production monitoring:

```bash
# Environment variables
APPLICATIONINSIGHTS_CONNECTION_STRING="your-app-insights-connection-string"
```

### Logging Configuration

Configure structured logging for production:

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
    } else {
      console.log(message, meta);
    }
  },
  error: (message: string, error?: Error, meta?: object) => {
    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({ 
        level: 'error', 
        message, 
        error: error?.message, 
        stack: error?.stack, 
        ...meta, 
        timestamp: new Date().toISOString() 
      }));
    } else {
      console.error(message, error, meta);
    }
  }
};
```

## 🚀 Performance Optimization

### Caching Strategy

- **Server-side caching** with Next.js `unstable_cache`
- **CDN caching** through deployment platform
- **Browser caching** with appropriate headers

### Bundle Optimization

```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Optimize bundle size
# - Enable tree shaking
# - Use dynamic imports for large components
# - Optimize images with Next.js Image component
```

### Database Optimization

- Use appropriate cache TTL values
- Implement connection pooling for high-traffic scenarios
- Monitor Azure Storage performance metrics

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Use HTTPS only (enforce in deployment platform)
- [ ] Set security headers (CSP, HSTS, etc.)
- [ ] Sanitize error messages for production
- [ ] Use secrets management for sensitive data
- [ ] Enable CORS only for required domains
- [ ] Implement rate limiting if needed
- [ ] Regular security updates and patches
- [ ] Monitor for unusual access patterns

### Azure Storage Security

- [ ] Use dedicated storage account for production
- [ ] Enable Azure Storage logging
- [ ] Configure firewall rules if needed
- [ ] Use SAS tokens instead of account keys when possible
- [ ] Regular key rotation
- [ ] Monitor access logs

## 🆘 Troubleshooting Deployment

### Common Issues

1. **Build Failures:**
   ```bash
   # Check Node.js version
   node --version  # Should be 18.17+
   
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json .next
   npm install
   npm run build
   ```

2. **Environment Variable Issues:**
   ```bash
   # Verify environment variables are set
   echo $AZURE_STORAGE_CONNECTION_STRING
   
   # Test connection
   npm run dev
   # Check browser console for connection errors
   ```

3. **Performance Issues:**
   - Monitor memory usage
   - Check cache hit rates
   - Analyze bundle size
   - Review Azure Storage metrics

4. **Connection Issues:**
   - Verify Azure Storage account accessibility
   - Check firewall rules
   - Test connection from deployment environment
   - Verify DNS resolution

### Rollback Strategy

1. **Vercel:** Use deployments dashboard to rollback
2. **Azure:** Use previous container image version
3. **Docker:** Keep previous image tags
4. **Kubernetes:** Use `kubectl rollout undo`

## 📋 Post-Deployment Checklist

After successful deployment:

- [ ] Test all major features (upload, download, delete)
- [ ] Verify environment-specific configuration
- [ ] Check application performance and response times
- [ ] Test error handling and recovery
- [ ] Verify security headers are in place
- [ ] Set up monitoring and alerting
- [ ] Document deployment process and configuration
- [ ] Plan backup and disaster recovery procedures

## 🔗 Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Vercel Deployment Documentation](https://vercel.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/best-practices/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

Need help with deployment? Check the [Troubleshooting Guide](./troubleshooting.md) or open an issue on GitHub.