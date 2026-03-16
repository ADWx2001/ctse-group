#!/bin/bash
# =============================================================================
# AWS Infrastructure Setup Script for Food Ordering System
# Run this once to set up ECS cluster, security groups, and log groups
# =============================================================================

set -e

REGION="us-east-1"
CLUSTER_NAME="food-ordering-cluster"
VPC_ID=""  # Set your VPC ID here
SUBNET_IDS="" # Comma-separated subnet IDs

echo "=== Food Ordering System — AWS Infrastructure Setup ==="

# 1. Create ECS Cluster
echo "[1/6] Creating ECS cluster..."
aws ecs create-cluster \
  --cluster-name $CLUSTER_NAME \
  --region $REGION \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1

# 2. Create CloudWatch Log Groups
echo "[2/6] Creating CloudWatch log groups..."
for service in user-service restaurant-service order-service notification-service; do
  aws logs create-log-group \
    --log-group-name /ecs/food-ordering/$service \
    --region $REGION || true
done

# 3. Create Security Group
echo "[3/6] Creating security group..."
SG_ID=$(aws ec2 create-security-group \
  --group-name food-ordering-ecs-sg \
  --description "Security group for Food Ordering ECS services" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' --output text)

# Allow inbound traffic on service ports
for port in 3001 3002 3003 3004; do
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port $port \
    --cidr 0.0.0.0/0 \
    --region $REGION
done

# Allow inter-service communication within the security group
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 0-65535 \
  --source-group $SG_ID \
  --region $REGION

echo "Security Group ID: $SG_ID"

# 4. Create ECS Task Execution Role (if not exists)
echo "[4/6] Creating IAM role for ECS task execution..."
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' || true

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Allow access to Secrets Manager
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name SecretsManagerAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:'$REGION':*:secret:food-ordering/*"
    }]
  }'

# 5. Create ECS Services
echo "[5/6] Registering task definitions..."
for service in user-service restaurant-service order-service notification-service; do
  aws ecs register-task-definition \
    --cli-input-json file://infrastructure/ecs/${service}-task-def.json \
    --region $REGION
done

# 6. Create ECS Services with Service Discovery
echo "[6/6] Creating ECS services..."
for service in user-service restaurant-service order-service notification-service; do
  PORT=$(echo $service | sed 's/user-service/3001/;s/restaurant-service/3002/;s/order-service/3003/;s/notification-service/3004/')

  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $service \
    --task-definition $service \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
    --region $REGION
done

echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "1. Store secrets in AWS Secrets Manager:"
echo "   aws secretsmanager create-secret --name food-ordering/jwt-secret --secret-string 'your-jwt-secret'"
echo "   aws secretsmanager create-secret --name food-ordering/mongodb-uri --secret-string 'your-mongodb-atlas-uri'"
echo "2. Update task definitions with your AWS Account ID and Docker Hub username"
echo "3. Push code to GitHub to trigger CI/CD pipelines"
echo "4. Configure GitHub repository secrets:"
echo "   - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
echo "   - DOCKER_HUB_USERNAME, DOCKER_HUB_TOKEN"
echo "   - SNYK_TOKEN, SONAR_TOKEN"
