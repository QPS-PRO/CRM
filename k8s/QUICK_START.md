# Kubernetes Quick Start Guide

## Prerequisites Checklist

- [ ] Kubernetes cluster running (Minikube, Docker Desktop, or cloud)
- [ ] `kubectl` installed and configured
- [ ] `docker` installed (for building images)
- [ ] Access to cluster verified: `kubectl cluster-info`

## Quick Deployment (5 Steps)

### 1. Update Secrets

```bash
# Generate secure SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Edit secrets (use strong passwords!)
nano k8s/backend-secret.yaml
nano k8s/postgres-secret.yaml
```

### 2. Build Images (Local)

```bash
# Build backend
docker build -t school-hub-backend:latest ./backend

# Build frontend
docker build -t school-hub-frontend:latest ./frontend

# For Minikube: Load images
minikube image load school-hub-backend:latest
minikube image load school-hub-frontend:latest
```

### 3. Deploy Everything

```bash
# Using the script
cd k8s
./deploy.sh --skip-build

# OR using kustomize
kubectl apply -k k8s/
```

### 4. Wait for Pods

```bash
kubectl get pods -n school-hub -w
```

Wait until all pods show `Running` status.

### 5. Access Application

```bash
# Port forward frontend
kubectl port-forward -n school-hub service/frontend 3000:80

# Port forward backend
kubectl port-forward -n school-hub service/backend 8000:8000
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin: http://localhost:8000/admin

## Verify Deployment

```bash
# Check all resources
kubectl get all -n school-hub

# Check pod logs
kubectl logs -l app=backend -n school-hub
kubectl logs -l app=celery-worker -n school-hub
```

## Common Issues

**Pods not starting?**
```bash
kubectl describe pod <pod-name> -n school-hub
```

**Database connection issues?**
```bash
kubectl logs -l app=postgres -n school-hub
kubectl logs -l app=backend -n school-hub
```

**Need to restart?**
```bash
kubectl rollout restart deployment/backend -n school-hub
```

## Clean Up

```bash
kubectl delete namespace school-hub
```

## Next Steps

- Read [KUBERNETES_DEPLOYMENT.md](../KUBERNETES_DEPLOYMENT.md) for detailed instructions
- Configure Ingress for production access
- Set up monitoring and logging
- Configure backups

