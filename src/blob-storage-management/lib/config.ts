/**
 * Configuration management and validation for Azure Storage integration
 * 
 * This module handles environment variable validation, configuration setup,
 * and provides utilities for managing Azure Storage connection settings.
 */

import { AzureStorageError } from '../types/azure-types';

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: AzureStorageConfig;
}

export interface AzureStorageConfig {
  connectionString?: string;
  accountName?: string;
  accountKey?: string;
  sasToken?: string;
  blobEndpoint?: string;
  defaultTimeout: number;
  maxRetryAttempts: number;
  retryDelayInMs: number;
}

export interface EnvironmentConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  enableTelemetry: boolean;
  enableCaching: boolean;
  defaultCacheTTL: number;
  maxUploadSizeBytes: number;
  allowedFileTypes?: string[];
  maxConcurrentUploads: number;
}

/**
 * Validate and parse Azure Storage configuration from environment variables
 */
export function validateAzureStorageConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get environment variables
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
  const blobEndpoint = process.env.AZURE_STORAGE_BLOB_ENDPOINT;
  
  // Validate authentication method
  const hasConnectionString = !!connectionString;
  const hasAccountCredentials = !!(accountName && (accountKey || sasToken));
  
  if (!hasConnectionString && !hasAccountCredentials) {
    errors.push(
      'Missing Azure Storage authentication. Provide either:\n' +
      '  1. AZURE_STORAGE_CONNECTION_STRING, or\n' +
      '  2. AZURE_STORAGE_ACCOUNT_NAME + (AZURE_STORAGE_ACCOUNT_KEY or AZURE_STORAGE_SAS_TOKEN)'
    );
  }

  if (hasConnectionString && hasAccountCredentials) {
    warnings.push(
      'Both connection string and account credentials provided. Connection string will be used.'
    );
  }

  // Validate connection string format
  if (connectionString && !isValidConnectionString(connectionString)) {
    errors.push('Invalid connection string format');
  }

  // Validate account name format
  if (accountName && !isValidAccountName(accountName)) {
    errors.push('Invalid storage account name format');
  }

  // Validate endpoint URL
  if (blobEndpoint && !isValidUrl(blobEndpoint)) {
    errors.push('Invalid blob endpoint URL format');
  }

  // Parse optional configuration
  const defaultTimeout = parseEnvNumber('AZURE_STORAGE_TIMEOUT', 30000);
  const maxRetryAttempts = parseEnvNumber('AZURE_STORAGE_MAX_RETRIES', 3);
  const retryDelayInMs = parseEnvNumber('AZURE_STORAGE_RETRY_DELAY', 1000);

  if (defaultTimeout < 1000) {
    warnings.push('Timeout is very low (< 1s), this may cause connection issues');
  }

  if (maxRetryAttempts > 10) {
    warnings.push('Max retry attempts is very high (> 10), this may cause slow responses');
  }

  const config: AzureStorageConfig = {
    connectionString,
    accountName,
    accountKey,
    sasToken,
    blobEndpoint,
    defaultTimeout,
    maxRetryAttempts,
    retryDelayInMs,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config: errors.length === 0 ? config : undefined,
  };
}

/**
 * Validate and parse environment configuration
 */
export function validateEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  return {
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    enableTelemetry: parseEnvBoolean('AZURE_STORAGE_ENABLE_TELEMETRY', false),
    enableCaching: parseEnvBoolean('AZURE_STORAGE_ENABLE_CACHING', true),
    defaultCacheTTL: parseEnvNumber('AZURE_STORAGE_CACHE_TTL', 60),
    maxUploadSizeBytes: parseEnvNumber('AZURE_STORAGE_MAX_UPLOAD_SIZE', 104857600), // 100MB
    allowedFileTypes: parseEnvArray('AZURE_STORAGE_ALLOWED_FILE_TYPES'),
    maxConcurrentUploads: parseEnvNumber('AZURE_STORAGE_MAX_CONCURRENT_UPLOADS', 3),
  };
}

/**
 * Check if the current configuration is valid and throw if not
 */
export function requireValidConfig(): { azureConfig: AzureStorageConfig; envConfig: EnvironmentConfig } {
  const validation = validateAzureStorageConfig();
  const envConfig = validateEnvironmentConfig();

  if (!validation.isValid) {
    throw new AzureStorageError(
      `Configuration validation failed:\n${validation.errors.join('\n')}`,
      500,
      'CONFIG_VALIDATION_ERROR'
    );
  }

  if (validation.warnings.length > 0) {
    console.warn('Configuration warnings:\n' + validation.warnings.join('\n'));
  }

  return {
    azureConfig: validation.config!,
    envConfig,
  };
}

/**
 * Get sanitized configuration info for client-side use
 */
export function getClientSafeConfig() {
  const { envConfig } = requireValidConfig();
  const validation = validateAzureStorageConfig();

  return {
    isConfigured: validation.isValid,
    hasErrors: !validation.isValid,
    environment: {
      isDevelopment: envConfig.isDevelopment,
      isProduction: envConfig.isProduction,
      maxUploadSizeBytes: envConfig.maxUploadSizeBytes,
      allowedFileTypes: envConfig.allowedFileTypes,
      maxConcurrentUploads: envConfig.maxConcurrentUploads,
    },
  };
}

/**
 * Test Azure Storage connection
 */
export async function testConnection(config?: AzureStorageConfig): Promise<{
  success: boolean;
  error?: string;
  accountInfo?: any;
}> {
  try {
    const { BlobServiceClient } = await import('@azure/storage-blob');
    
    const configToUse = config || requireValidConfig().azureConfig;
    
    let client: any;
    if (configToUse.connectionString) {
      client = BlobServiceClient.fromConnectionString(configToUse.connectionString);
    } else {
      throw new Error('Connection testing with account credentials not implemented');
    }

    const accountInfo = await client.getAccountInfo();
    
    return {
      success: true,
      accountInfo: {
        accountKind: accountInfo.accountKind,
        skuName: accountInfo.skuName,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection test failed',
    };
  }
}

// Utility functions

function isValidConnectionString(connectionString: string): boolean {
  // Basic validation for Azure Storage connection string
  const requiredParts = ['DefaultEndpointsProtocol', 'AccountName', 'AccountKey'];
  return requiredParts.every(part => connectionString.includes(`${part}=`));
}

function isValidAccountName(accountName: string): boolean {
  // Azure Storage account name rules:
  // - 3-24 characters
  // - lowercase letters and numbers only
  return /^[a-z0-9]{3,24}$/.test(accountName);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function parseEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  return value.toLowerCase() === 'true';
}

function parseEnvArray(key: string): string[] | undefined {
  const value = process.env[key];
  if (!value) return undefined;
  
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Generate development connection string for Azure Storage Emulator
 */
export function getEmulatorConnectionString(): string {
  return 'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;';
}

/**
 * Setup development environment with emulator
 */
export function setupDevelopmentEnvironment(): void {
  if (process.env.NODE_ENV === 'development' && !process.env.AZURE_STORAGE_CONNECTION_STRING) {
    console.log('Development mode detected, using Azure Storage Emulator connection string');
    process.env.AZURE_STORAGE_CONNECTION_STRING = getEmulatorConnectionString();
  }
}