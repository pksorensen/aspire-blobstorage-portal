# GitHub Actions CI/CD Setup

This document describes the GitHub Actions workflows configured for the Azure Storage Explorer project.

## Workflows Overview

### 1. Docker Build and Push (`.github/workflows/docker-build-push.yml`)

**Purpose**: Builds and pushes Docker images to GitHub Container Registry (GHCR)

**Triggers**:
- Push to `main` or `develop` branches
- Push of tags starting with `v*` (e.g., `v1.0.0`)
- Pull requests to `main` or `develop` (build only, no push)

**Features**:
- ✅ Multi-platform builds (linux/amd64, linux/arm64)
- ✅ Automated tagging based on branch/tag/PR
- ✅ GitHub Container Registry integration
- ✅ Build caching with GitHub Actions cache
- ✅ Security scanning with Trivy
- ✅ Build provenance and SBOM generation
- ✅ Container deployment testing

**Image Tags**:
- `latest` - Latest build from main branch
- `main` - Latest build from main branch
- `develop` - Latest build from develop branch
- `pr-123` - Pull request builds
- `v1.0.0` - Semantic version tags
- `main-abc1234` - Branch with commit SHA

### 2. Continuous Integration (`.github/workflows/ci.yml`)

**Purpose**: Runs linting, type checking, building, and testing

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs**:
- **lint-and-test**: ESLint, TypeScript checking, Next.js build, Playwright tests
- **security-scan**: Trivy vulnerability scanning of source code

## Setup Instructions

### 1. Repository Permissions

The workflows require the following permissions (automatically configured):
- `contents: read` - Access repository content
- `packages: write` - Push to GitHub Container Registry
- `attestations: write` - Generate build attestations
- `id-token: write` - OIDC token for provenance

### 2. GitHub Container Registry

Images are automatically pushed to:
```
ghcr.io/[username]/[repository]/azure-storage-explorer
```

**Access the registry**:
```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull the image
docker pull ghcr.io/[username]/[repository]/azure-storage-explorer:latest
```

### 3. Environment Variables

No additional secrets are required. The workflows use:
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
- `github.actor` - Current user/organization name

## Usage Examples

### Pull and Run Latest Image

```bash
# Pull the latest image
docker pull ghcr.io/[username]/[repository]/azure-storage-explorer:latest

# Run the container
docker run -p 3000:3000 ghcr.io/[username]/[repository]/azure-storage-explorer:latest
```

### Use in Docker Compose

```yaml
version: '3.8'
services:
  app:
    image: ghcr.io/[username]/[repository]/azure-storage-explorer:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

### Deploy Specific Version

```bash
# Deploy a specific version
docker pull ghcr.io/[username]/[repository]/azure-storage-explorer:v1.0.0

# Or deploy from develop branch
docker pull ghcr.io/[username]/[repository]/azure-storage-explorer:develop
```

## Monitoring and Troubleshooting

### Workflow Status

Monitor workflow runs in the GitHub repository:
- Go to **Actions** tab
- View build logs and test results
- Download Playwright test reports from artifacts

### Security Scanning

Security scan results are available in:
- **Security** tab → **Code scanning alerts**
- Trivy scans both source code and built container images

### Container Registry

View published images:
- Repository → **Packages** tab
- Or visit: `https://github.com/users/[username]/packages/container/package/[repository]%2Fazure-storage-explorer`

## Workflow Customization

### Adding Environment Variables

To add environment variables for the Docker build:

```yaml
# In docker-build-push.yml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    build-args: |
      NODE_ENV=production
      CUSTOM_VAR=${{ secrets.CUSTOM_VAR }}
```

### Modifying Trigger Conditions

```yaml
# Only trigger on specific paths
on:
  push:
    paths:
      - 'src/blob-storage-management/**'
      - 'Dockerfile'
      - '.github/workflows/**'
```

### Adding Additional Platforms

```yaml
# Add more platforms
platforms: linux/amd64,linux/arm64,linux/arm/v7
```

## Security Best Practices

1. **Minimal Permissions**: Workflows use only required permissions
2. **Provenance**: Build provenance is automatically generated
3. **SBOM**: Software Bill of Materials is included
4. **Vulnerability Scanning**: Trivy scans for security issues
5. **Immutable Tags**: Each build has unique SHA-based tags
6. **Non-root Container**: Docker image runs as non-root user

## Troubleshooting Common Issues

### Build Failures

1. Check Node.js version compatibility
2. Verify package.json scripts exist
3. Review Dockerfile syntax

### Push Permission Errors

1. Ensure repository has "Actions" permissions enabled
2. Check if organization blocks third-party actions
3. Verify the actor has push permissions to the repository

### Test Failures

1. Review Playwright test reports in workflow artifacts
2. Check if tests require specific environment setup
3. Verify test data and mocks are properly configured

## Performance Optimization

The workflows include several optimizations:
- **Build Caching**: Docker layer caching with GitHub Actions cache
- **Dependency Caching**: Node.js dependencies cached between runs
- **Multi-stage Builds**: Minimal production image size
- **Parallel Jobs**: CI jobs run concurrently where possible