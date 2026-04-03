#!/bin/bash
# =============================================================================
# Build all Docker images and push them to Azure Container Registry
#
# Usage:
#   export ACR_NAME=yourregistry   # just the name, not .azurecr.io
#   bash infrastructure/azure/push-images.sh
# =============================================================================

set -e

ACR_NAME="${ACR_NAME:?Set ACR_NAME env var (e.g. foodorderacrabc123)}"
ACR_SERVER="$ACR_NAME.azurecr.io"
TAG="${TAG:-latest}"

echo "=== Pushing images to $ACR_SERVER ==="

# Login to ACR
az acr login --name "$ACR_NAME"

# Services and their build contexts
declare -A SERVICES=(
  ["food-ordering-user-service"]="./user-service"
  ["food-ordering-restaurant-service"]="./restaurant-service"
  ["food-ordering-order-service"]="./order-service"
  ["food-ordering-notification-service"]="./notification-service"
)

for IMAGE in "${!SERVICES[@]}"; do
  CONTEXT="${SERVICES[$IMAGE]}"
  echo ""
  echo "--- Building $IMAGE from $CONTEXT ---"
  docker build -t "$ACR_SERVER/$IMAGE:$TAG" "$CONTEXT"
  docker push "$ACR_SERVER/$IMAGE:$TAG"
  echo "    Pushed $ACR_SERVER/$IMAGE:$TAG"
done

# Frontend needs build args — get service URLs from Azure
echo ""
echo "--- Building frontend ---"
echo "Fetching service URLs from Azure..."

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-food-ordering}"

USER_URL=$(az containerapp show -n user-service -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null || echo "")
RESTAURANT_URL=$(az containerapp show -n restaurant-service -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null || echo "")
ORDER_URL=$(az containerapp show -n order-service -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null || echo "")
NOTIFICATION_URL=$(az containerapp show -n notification-service -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null || echo "")

if [ -z "$USER_URL" ]; then
  echo "WARNING: Could not fetch service URLs. Deploy backend services first, then re-run for frontend."
  echo "Skipping frontend build."
else
  docker build \
    --build-arg NEXT_PUBLIC_USER_SERVICE_URL="https://$USER_URL" \
    --build-arg NEXT_PUBLIC_RESTAURANT_SERVICE_URL="https://$RESTAURANT_URL" \
    --build-arg NEXT_PUBLIC_ORDER_SERVICE_URL="https://$ORDER_URL" \
    --build-arg NEXT_PUBLIC_NOTIFICATION_SERVICE_URL="https://$NOTIFICATION_URL" \
    -t "$ACR_SERVER/food-ordering-frontend:$TAG" \
    ./frontend
  docker push "$ACR_SERVER/food-ordering-frontend:$TAG"
  echo "    Pushed $ACR_SERVER/food-ordering-frontend:$TAG"
fi

echo ""
echo "=== Done ==="
