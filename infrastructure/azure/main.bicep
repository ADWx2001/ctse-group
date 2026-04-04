// ============================================================================
// Food Ordering System — Azure Infrastructure (Bicep)
// Deploys: ACR, Log Analytics, Container Apps Environment, Cosmos DB (Mongo),
//          PostgreSQL Flexible Server, Key Vault, and 5 Container Apps.
// ============================================================================

@description('Base name used to derive resource names')
param projectName string = 'foodorder'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('PostgreSQL administrator login')
param postgresAdminUser string = 'pgadmin'

@secure()
@description('PostgreSQL administrator password')
param postgresAdminPassword string

@secure()
@description('Shared JWT secret used by all services')
param jwtSecret string

@secure()
@description('MongoDB connection string (Cosmos DB)')
param mongodbUri string = ''

@description('SMTP host for notification service')
param smtpHost string = 'smtp.gmail.com'

@description('SMTP port')
param smtpPort string = '587'

@secure()
@description('SMTP user')
param smtpUser string = ''

@secure()
@description('SMTP password')
param smtpPassword string = ''

@description('From email address')
param fromEmail string = 'noreply@foodordering.com'

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
var uniqueSuffix = uniqueString(resourceGroup().id)
var acrName = '${projectName}acr${uniqueSuffix}'
var logAnalyticsName = '${projectName}-logs-${uniqueSuffix}'
var appInsightsName = '${projectName}-insights'
var envName = '${projectName}-env'
var cosmosName = '${projectName}-cosmos-${uniqueSuffix}'
var pgServerName = '${projectName}-pg-${uniqueSuffix}'
var kvName = '${projectName}-kv-${take(uniqueSuffix, 8)}'
var pgDatabaseRestaurant = 'restaurant_db'
var pgDatabaseNotification = 'notification_db'

// ---------------------------------------------------------------------------
// Log Analytics Workspace
// ---------------------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ---------------------------------------------------------------------------
// Application Insights
// ---------------------------------------------------------------------------
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ---------------------------------------------------------------------------
// Azure Container Registry (Basic SKU — suitable for assignments)
// ---------------------------------------------------------------------------
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// ---------------------------------------------------------------------------
// Container Apps Environment
// ---------------------------------------------------------------------------
resource containerEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Pre-computed service FQDNs — avoids circular dependencies between Container Apps
// Format: {appname}.{containerEnv.properties.defaultDomain}
var envDomain = containerEnv.properties.defaultDomain
var userServiceFqdn = 'user-service.${envDomain}'
var restaurantServiceFqdn = 'restaurant-service.${envDomain}'
var orderServiceFqdn = 'order-service.${envDomain}'
var notificationServiceFqdn = 'notification-service.${envDomain}'
var frontendFqdn = 'frontend.${envDomain}'

// ---------------------------------------------------------------------------
// Azure Cosmos DB for MongoDB (Serverless — cost-effective for assignments)
// ---------------------------------------------------------------------------
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosName
  location: location
  kind: 'MongoDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    apiProperties: {
      serverVersion: '4.0'
    }
    capabilities: [
      { name: 'EnableMongo' }
      { name: 'EnableServerless' }
    ]
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

resource cosmosDbUsers 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: 'foodorder_users'
  properties: {
    resource: {
      id: 'foodorder_users'
    }
  }
}

resource cosmosDbOrders 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: 'foodorder_orders'
  properties: {
    resource: {
      id: 'foodorder_orders'
    }
  }
}

// ---------------------------------------------------------------------------
// PostgreSQL Flexible Server (Burstable B1ms — good for demo/assignment)
// ---------------------------------------------------------------------------
resource pgServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: pgServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '15'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// Allow Azure services to connect
resource pgFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: pgServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource pgDbRestaurant 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: pgServer
  name: pgDatabaseRestaurant
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource pgDbNotification 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: pgServer
  name: pgDatabaseNotification
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ---------------------------------------------------------------------------
// Key Vault
// ---------------------------------------------------------------------------
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// Store secrets
resource kvSecretJwt 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'jwt-secret'
  properties: {
    value: jwtSecret
  }
}

resource kvSecretMongo 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'mongodb-uri'
  properties: {
    value: mongodbUri != '' ? mongodbUri : cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
  }
}

resource kvSecretPgPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'postgres-password'
  properties: {
    value: postgresAdminPassword
  }
}

// ---------------------------------------------------------------------------
// Derived connection strings for use in Container Apps
// ---------------------------------------------------------------------------
var cosmosBaseUri = mongodbUri != '' ? mongodbUri : cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
// Cosmos DB connection string format: mongodb://host:port/?ssl=true&... — insert dbName before '?'
var cosmosUserDbUri = replace(cosmosBaseUri, '/?', '/foodorder_users?')
var cosmosOrderDbUri = replace(cosmosBaseUri, '/?', '/foodorder_orders?')
var pgConnectionBase = 'postgresql+asyncpg://${postgresAdminUser}:${uriComponent(postgresAdminPassword)}@${pgServer.properties.fullyQualifiedDomainName}:5432'
var pgRestaurantUrl = '${pgConnectionBase}/${pgDatabaseRestaurant}?ssl=require'
var pgNotificationUrl = '${pgConnectionBase}/${pgDatabaseNotification}?ssl=require'

// ---------------------------------------------------------------------------
// Container Apps
// ---------------------------------------------------------------------------

// --- user-service ---
resource userServiceApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'user-service'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3001
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
        }
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
        { name: 'mongodb-uri', value: cosmosUserDbUri }
        { name: 'jwt-secret', value: jwtSecret }
      ]
    }
    template: {
      containers: [
        {
          name: 'user-service'
          image: '${acr.properties.loginServer}/food-ordering-user-service:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3001' }
            { name: 'MONGODB_URI', secretRef: 'mongodb-uri' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'JWT_EXPIRES_IN', value: '7d' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3001
              }
              periodSeconds: 30
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// --- restaurant-service ---
resource restaurantServiceApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'restaurant-service'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3002
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
        }
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
        { name: 'database-url', value: pgRestaurantUrl }
        { name: 'jwt-secret', value: jwtSecret }
      ]
    }
    template: {
      containers: [
        {
          name: 'restaurant-service'
          image: '${acr.properties.loginServer}/food-ordering-restaurant-service:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'ENVIRONMENT', value: 'production' }
            { name: 'PORT', value: '3002' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'USER_SERVICE_URL', value: 'https://${userServiceFqdn}' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3002
              }
              periodSeconds: 30
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// --- order-service ---
resource orderServiceApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'order-service'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3003
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
        }
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
        { name: 'mongodb-uri', value: cosmosOrderDbUri }
        { name: 'jwt-secret', value: jwtSecret }
      ]
    }
    template: {
      containers: [
        {
          name: 'order-service'
          image: '${acr.properties.loginServer}/food-ordering-order-service:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3003' }
            { name: 'MONGODB_URI', secretRef: 'mongodb-uri' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'JWT_EXPIRES_IN', value: '7d' }
            { name: 'USER_SERVICE_URL', value: 'https://${userServiceFqdn}' }
            { name: 'RESTAURANT_SERVICE_URL', value: 'https://${restaurantServiceFqdn}' }
            { name: 'NOTIFICATION_SERVICE_URL', value: 'https://${notificationServiceFqdn}' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3003
              }
              periodSeconds: 30
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// --- notification-service ---
resource notificationServiceApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'notification-service'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3004
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
        }
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
        { name: 'database-url', value: pgNotificationUrl }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'smtp-user', value: empty(smtpUser) ? 'placeholder' : smtpUser }
        { name: 'smtp-password', value: empty(smtpPassword) ? 'placeholder' : smtpPassword }
      ]
    }
    template: {
      containers: [
        {
          name: 'notification-service'
          image: '${acr.properties.loginServer}/food-ordering-notification-service:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'ENVIRONMENT', value: 'production' }
            { name: 'PORT', value: '3004' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'ORDER_SERVICE_URL', value: 'https://${orderServiceFqdn}' }
            { name: 'SMTP_HOST', value: smtpHost }
            { name: 'SMTP_PORT', value: smtpPort }
            { name: 'SMTP_USER', secretRef: 'smtp-user' }
            { name: 'SMTP_PASSWORD', secretRef: 'smtp-password' }
            { name: 'FROM_EMAIL', value: fromEmail }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3004
              }
              periodSeconds: 30
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// --- frontend ---
resource frontendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'frontend'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
      ]
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: '${acr.properties.loginServer}/food-ordering-frontend:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: []
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/'
                port: 3000
              }
              periodSeconds: 30
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output acrLoginServer string = acr.properties.loginServer
output frontendUrl string = 'https://${frontendFqdn}'
output userServiceUrl string = 'https://${userServiceFqdn}'
output restaurantServiceUrl string = 'https://${restaurantServiceFqdn}'
output orderServiceUrl string = 'https://${orderServiceFqdn}'
output notificationServiceUrl string = 'https://${notificationServiceFqdn}'
output postgresServerFqdn string = pgServer.properties.fullyQualifiedDomainName
output keyVaultName string = keyVault.name
