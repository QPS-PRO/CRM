# Kubernetes Deployment Guide

This guide provides step-by-step instructions for deploying the School Hub application to Kubernetes.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Building Docker Images](#building-docker-images)
3. [Configuring Kubernetes Resources](#configuring-kubernetes-resources)
4. [Deploying to Kubernetes](#deploying-to-kubernetes)
5. [Verifying Deployment](#verifying-deployment)
6. [Accessing the Application](#accessing-the-application)
7. [Troubleshooting](#troubleshooting)
8. [Production Considerations](#production-considerations)

## Prerequisites

### 1. Kubernetes Cluster

You need a Kubernetes cluster running. Options include:

- **Local Development**: 
  - [Minikube](https://minikube.sigs.k8s.io/docs/start/)
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Kubernetes)
  - [Kind](https://kind.sigs.k8s.io/) (Kubernetes in Docker)
  
- **Cloud Providers**:
  - Google Kubernetes Engine (GKE)
  - Amazon Elastic Kubernetes Service (EKS)
  - Azure Kubernetes Service (AKS)

### 2. Required Tools

- `kubectl` - Kubernetes command-line tool
- `docker` - For building container images
- `kustomize` (optional) - For managing Kubernetes configurations

### 3. Verify Kubernetes Access

```bash
kubectl cluster-info
kubectl get nodes
```

## Building Docker Images

### Option 1: Build Locally (for local Kubernetes)

```bash
# Build backend image
cd backend
docker build -t school-hub-backend:latest .

# Build frontend image
cd ../frontend
docker build -t school-hub-frontend:latest .
```

### Option 2: Build and Push to Container Registry

For cloud deployments, you'll need to push images to a container registry:

```bash
# Set your registry (e.g., Docker Hub, GCR, ECR)
export REGISTRY="your-registry.io"  # or "docker.io/username" for Docker Hub

# Build and tag backend
cd backend
docker build -t ${REGISTRY}/school-hub-backend:latest .
docker push ${REGISTRY}/school-hub-backend:latest

# Build and tag frontend
cd ../frontend
docker build -t ${REGISTRY}/school-hub-frontend:latest .
docker push ${REGISTRY}/school-hub-frontend:latest
```

**Update deployment files** with your registry:

```bash
# Update image references in deployment files
sed -i '' "s|school-hub-backend:latest|${REGISTRY}/school-hub-backend:latest|g" k8s/*.yaml
sed -i '' "s|school-hub-frontend:latest|${REGISTRY}/school-hub-frontend:latest|g" k8s/*.yaml
```

### Option 3: Load Images into Minikube/Docker Desktop

If using Minikube or Docker Desktop:

```bash
# For Minikube
minikube image load school-hub-backend:latest
minikube image load school-hub-frontend:latest

# For Docker Desktop, images are automatically available
```

## Configuring Kubernetes Resources

### 1. Update Secrets

**⚠️ IMPORTANT**: Before deploying, update the secrets with secure values:

```bash
# Generate a secure Django SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Edit the secret file
nano k8s/backend-secret.yaml
```

Update these values in `k8s/backend-secret.yaml`:
- `SECRET_KEY`: Generate a secure random key
- `DB_PASSWORD`: Use a strong database password

Update `k8s/postgres-secret.yaml`:
- `password`: Should match the `DB_PASSWORD` in backend-secret

### 2. Update ConfigMap (if needed)

Edit `k8s/backend-configmap.yaml` to adjust:
- `DEBUG`: Set to `"False"` for production
- `ALLOWED_HOSTS`: Add your domain(s)
- `CORS_ALLOWED_ORIGINS`: Add your frontend domain(s)
- `TIME_ZONE`: Set your timezone (e.g., `"America/New_York"`)

### 3. Update Ingress (if using)

Edit `k8s/ingress.yaml`:
- Change `host: school-hub.local` to your actual domain
- Ensure you have an Ingress Controller installed (e.g., NGINX Ingress)

## Deploying to Kubernetes

### Step 1: Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### Step 2: Deploy PostgreSQL

```bash
kubectl apply -f k8s/postgres-configmap.yaml
kubectl apply -f k8s/postgres-secret.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
```

Wait for PostgreSQL to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=postgres -n school-hub --timeout=120s
```

### Step 3: Deploy Redis

```bash
kubectl apply -f k8s/redis-deployment.yaml
```

Wait for Redis to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=redis -n school-hub --timeout=60s
```

### Step 4: Deploy Backend

```bash
kubectl apply -f k8s/backend-configmap.yaml
kubectl apply -f k8s/backend-secret.yaml
kubectl apply -f k8s/backend-deployment.yaml
```

Wait for backend to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=backend -n school-hub --timeout=120s
```

### Step 5: Deploy Celery Worker and Beat

```bash
kubectl apply -f k8s/celery-worker-deployment.yaml
kubectl apply -f k8s/celery-beat-deployment.yaml
```

### Step 6: Deploy Frontend

```bash
kubectl apply -f k8s/frontend-deployment.yaml
```

### Step 7: Deploy Ingress (Optional)

If you have an Ingress Controller:

```bash
kubectl apply -f k8s/ingress.yaml
```

### Alternative: Deploy All at Once

You can also deploy everything using kustomize:

```bash
kubectl apply -k k8s/
```

## Verifying Deployment

### Check All Pods

```bash
kubectl get pods -n school-hub
```

You should see:
- `postgres-*` (1 pod)
- `redis-*` (1 pod)
- `backend-*` (2 pods)
- `celery-worker-*` (1 pod)
- `celery-beat-*` (1 pod)
- `frontend-*` (2 pods)

### Check Services

```bash
kubectl get services -n school-hub
```

### Check Pod Logs

```bash
# Backend logs
kubectl logs -l app=backend -n school-hub --tail=50

# Celery worker logs
kubectl logs -l app=celery-worker -n school-hub --tail=50

# Celery beat logs
kubectl logs -l app=celery-beat -n school-hub --tail=50

# Frontend logs
kubectl logs -l app=frontend -n school-hub --tail=50
```

### Check Database Migrations

```bash
# Check if migrations ran successfully
kubectl logs -l app=backend -n school-hub | grep -i migration
```

### Initialize Database (if needed)

If you need to create a superuser or run additional setup:

```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pods -l app=backend -n school-hub -o jsonpath='{.items[0].metadata.name}')

# Create superuser
kubectl exec -it $BACKEND_POD -n school-hub -- python manage.py createsuperuser
```

## Accessing the Application

### Option 1: Port Forwarding (Development/Testing)

```bash
# Forward frontend
kubectl port-forward -n school-hub service/frontend 3000:80

# Forward backend
kubectl port-forward -n school-hub service/backend 8000:8000
```

Then access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin: http://localhost:8000/admin

### Option 2: NodePort (if configured)

```bash
# Get NodePort for frontend
kubectl get service frontend -n school-hub

# Access via <node-ip>:<nodeport>
```

### Option 3: Ingress (Production)

If you configured Ingress:

```bash
# Get ingress IP/domain
kubectl get ingress -n school-hub

# Access via the configured domain
```

### Option 4: LoadBalancer

If your cluster supports LoadBalancer services, the frontend service is already configured as LoadBalancer:

```bash
# Get external IP
kubectl get service frontend -n school-hub

# Wait for EXTERNAL-IP to be assigned, then access it
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n school-hub

# Check events
kubectl get events -n school-hub --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
kubectl get pods -l app=postgres -n school-hub

# Check PostgreSQL logs
kubectl logs -l app=postgres -n school-hub

# Test connection from backend pod
kubectl exec -it <backend-pod> -n school-hub -- nc -zv postgres 5432
```

### Redis Connection Issues

```bash
# Check if Redis is running
kubectl get pods -l app=redis -n school-hub

# Test Redis connection
kubectl exec -it <backend-pod> -n school-hub -- redis-cli -h redis ping
```

### Image Pull Errors

If you see `ImagePullBackOff`:

1. **Local images**: Ensure images are loaded into your cluster
2. **Registry images**: Check image pull secrets and registry access
3. **Private registry**: Create and use image pull secrets

```bash
# Create image pull secret (for private registries)
kubectl create secret docker-registry regcred \
  --docker-server=<registry-url> \
  --docker-username=<username> \
  --docker-password=<password> \
  --docker-email=<email> \
  -n school-hub

# Add to deployment spec:
# imagePullSecrets:
# - name: regcred
```

### Celery Not Working

```bash
# Check Celery worker logs
kubectl logs -l app=celery-worker -n school-hub

# Check Celery beat logs
kubectl logs -l app=celery-beat -n school-hub

# Verify Redis connection
kubectl exec -it <celery-worker-pod> -n school-hub -- redis-cli -h redis ping
```

### Frontend Not Loading

```bash
# Check frontend logs
kubectl logs -l app=frontend -n school-hub

# Check if backend API is accessible
kubectl exec -it <frontend-pod> -n school-hub -- wget -O- http://backend:8000/api/
```

### Restart Pods

```bash
# Restart all pods in a deployment
kubectl rollout restart deployment/<deployment-name> -n school-hub

# Example:
kubectl rollout restart deployment/backend -n school-hub
```

## Production Considerations

### 1. Security

- ✅ Change all default passwords
- ✅ Use strong, randomly generated SECRET_KEY
- ✅ Set `DEBUG=False` in production
- ✅ Configure proper `ALLOWED_HOSTS`
- ✅ Use TLS/HTTPS for Ingress
- ✅ Use Kubernetes Secrets or external secret management (e.g., HashiCorp Vault)
- ✅ Enable network policies
- ✅ Use RBAC for service accounts

### 2. Resource Management

- Adjust resource requests/limits in deployment files based on your needs
- Consider using Horizontal Pod Autoscaler (HPA) for auto-scaling
- Monitor resource usage

### 3. Persistence

- PostgreSQL uses PersistentVolumeClaim (10Gi)
- Consider using StorageClass for dynamic provisioning
- Set up regular database backups

### 4. High Availability

- Increase replica counts for backend and frontend
- Consider using PostgreSQL with replication
- Use Redis Sentinel or Redis Cluster for Redis HA

### 5. Monitoring and Logging

- Set up monitoring (e.g., Prometheus, Grafana)
- Configure centralized logging (e.g., ELK stack, Loki)
- Set up alerts for pod failures

### 6. CI/CD

- Automate image builds and deployments
- Use GitOps tools (e.g., ArgoCD, Flux)
- Implement blue-green or canary deployments

### 7. Environment-Specific Configs

Create separate configs for different environments:

```bash
k8s/
├── base/
│   └── (common resources)
├── overlays/
│   ├── dev/
│   ├── staging/
│   └── production/
```

## Quick Reference Commands

```bash
# View all resources
kubectl get all -n school-hub

# Delete everything
kubectl delete namespace school-hub

# Scale deployments
kubectl scale deployment backend --replicas=3 -n school-hub

# View resource usage
kubectl top pods -n school-hub

# Execute command in pod
kubectl exec -it <pod-name> -n school-hub -- <command>

# Copy file to/from pod
kubectl cp <pod-name>:/path/to/file ./local-file -n school-hub
```

## Next Steps

1. Set up monitoring and alerting
2. Configure automated backups
3. Set up CI/CD pipeline
4. Implement proper secret management
5. Configure network policies
6. Set up SSL/TLS certificates
7. Configure autoscaling

For more information, refer to:
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Django Deployment Best Practices](https://docs.djangoproject.com/en/stable/howto/deployment/)
- [React Production Build](https://create-react-app.dev/docs/production-build/)

