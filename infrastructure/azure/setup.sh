#!/bin/bash
# =============================================================================
# Azure Infrastructure Setup Script for Food Ordering System
# Replaces the previous AWS ECS setup (infrastructure/setup.sh)
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - A subscription selected (az account set --subscription <id>)
# =============================================================================

set -e

# ---------- Configuration (edit these) ----------
RESOURCE_GROUP="rg-food-ordering"
LOCATION="eastus"
PROJECT_NAME="foodorder"

# Secrets — set these before running or export as env vars
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD env var}"
JWT_SECRET="${JWT_SECRET:?Set JWT_SECRET env var}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"

echo "=== Food Ordering System — Azure Infrastructure Setup ==="
echo "Resource Group : $RESOURCE_GROUP"
echo "Location       : $LOCATION"
echo ""

# 1. Create resource group
echo "[1/4] Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

# 2. Deploy Bicep template
echo "[2/4] Deploying Bicep template (this takes a few minutes)..."
DEPLOYMENT_OUTPUT=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file infrastructure/azure/main.bicep \
  --parameters infrastructure/azure/main.parameters.json \
  --parameters \
    location="$LOCATION" \
    postgresAdminPassword="$POSTGRES_PASSWORD" \
    jwtSecret="$JWT_SECRET" \
    smtpUser="$SMTP_USER" \
    smtpPassword="$SMTP_PASSWORD" \
  --query properties.outputs \
  --output json)

echo "$DEPLOYMENT_OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for k, v in data.items():
    print(f'  {k}: {v[\"value\"]}')
" 2>/dev/null || echo "$DEPLOYMENT_OUTPUT"

# 3. Extract ACR name for image push
ACR_LOGIN_SERVER=$(echo "$DEPLOYMENT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['acrLoginServer']['value'])" 2>/dev/null)
echo ""
echo "[3/4] ACR Login Server: $ACR_LOGIN_SERVER"

# 4. Print next steps
echo ""
echo "[4/4] Setup complete!"
echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Push container images to ACR:"
echo "   az acr login --name ${ACR_LOGIN_SERVER%%.*}"
echo "   docker build -t $ACR_LOGIN_SERVER/food-ordering-user-service:latest ./user-service"
echo "   docker push $ACR_LOGIN_SERVER/food-ordering-user-service:latest"
echo "   (repeat for restaurant-service, order-service, notification-service, frontend)"
echo ""
echo "2. Or run the helper script:"
echo "   bash infrastructure/azure/push-images.sh"
echo ""
echo "3. Configure GitHub Secrets for CI/CD:"
echo "   AZURE_CREDENTIALS      — Service principal JSON (az ad sp create-for-rbac)"
echo "   AZURE_RESOURCE_GROUP   — $RESOURCE_GROUP"
echo "   ACR_NAME               — ${ACR_LOGIN_SERVER%%.*}"
echo "   POSTGRES_ADMIN_PASSWORD"
echo "   JWT_SECRET"
echo "   SMTP_USER / SMTP_PASSWORD"
echo "   SNYK_TOKEN / SONAR_TOKEN"
echo ""
echo "4. After first deploy, grab the service URLs from Azure Portal or:"
echo "   az containerapp show -n user-service -g $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv"
echo "   Then set these as GitHub Secrets for the frontend build:"
echo "   USER_SERVICE_URL, RESTAURANT_SERVICE_URL, ORDER_SERVICE_URL, NOTIFICATION_SERVICE_URL"
