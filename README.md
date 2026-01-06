# School Hub - Attendance Management System

A comprehensive school attendance management system with fingerprint device integration, SMS notifications, and real-time attendance tracking.

> 📝 **Quick Start**: Copy [`backend/.env.example`](./backend/.env.example) to `backend/.env` and configure your environment variables before starting the application.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Local Development Setup](#local-development-setup)
  - [Backend Setup (Django)](#backend-setup-django)
  - [Frontend Setup (React)](#frontend-setup-react)
  - [Running the Application](#running-the-application)
- [Kubernetes Deployment](#kubernetes-deployment)
  - [Prerequisites](#prerequisites-1)
  - [Deployment Steps](#deployment-steps)
  - [Accessing the Application](#accessing-the-application)
- [Environment Variables](#environment-variables)
- [Deployment Checklist](#deployment-checklist)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Additional Documentation](#additional-documentation)

## ✨ Features

- 👥 **Student & Parent Management**: Complete CRUD operations for students and parents
- 🏢 **Branch Management**: Multi-branch support for schools
- 📱 **Fingerprint Device Integration**: ZKTeco device support for attendance tracking
- ✅ **Real-time Attendance Tracking**: Check-in/Check-out with status (Attended/Late/Absent)
- 📊 **Attendance Reports**: Comprehensive reports with filtering and PDF export
- 📧 **SMS Notifications**: Automated SMS notifications to parents
- 🌐 **Multi-language Support**: English and Arabic (RTL support)
- 📄 **Excel Import/Export**: Bulk upload for students and parents
- 🔐 **Authentication & Authorization**: Secure session-based authentication
- ⚡ **Background Tasks**: Celery for async processing

## 📦 Prerequisites

### For Local Development:
- **Python 3.11+**
- **Node.js 18+** and npm
- **PostgreSQL 15+**
- **Redis** (for Celery)
- **Git**

### For Kubernetes Deployment:
- **Kubernetes cluster** (Minikube, Docker Desktop, or cloud provider)
- **kubectl** installed and configured
- **Docker** installed
- **PostgreSQL** (can be deployed via Kubernetes)
- **Redis** (can be deployed via Kubernetes)

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended for Quick Testing)

```bash
# Clone the repository
git clone <repository-url>
cd "School Hub"

# Build and run
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api
# Admin: http://localhost:8000/admin
```

### Option 2: Local Development (See detailed setup below)

## 💻 Local Development Setup

### Backend Setup (Django)

#### 1. Create and Activate Virtual Environment

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

#### 2. Install Dependencies

```bash
# Install Python packages
pip install -r requirements.txt
```

#### 3. Set Up Environment Variables

Create a `.env` file in the `backend` directory by copying the example file:

```bash
cd backend
cp .env.example .env
```


**Important**: 
- Generate a secure `SECRET_KEY`:
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(50))"
  ```
- Update database credentials to match your PostgreSQL setup
- Configure optional services (SMS/WhatsApp) if needed

See [`.env.example`](./backend/.env.example) for all available environment variables with descriptions.

#### 4. Set Up Database

```bash
# Make sure PostgreSQL is running
# Create database
createdb schoolhub

# Or using psql:
psql -U postgres
CREATE DATABASE schoolhub;
\q

# Run migrations
python manage.py migrate

# Create superuser (optional, for admin access)
python manage.py createsuperuser
```

#### 5. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

#### 6. Run Development Server

```bash
# Run Django development server
python manage.py runserver

# Server will be available at http://localhost:8000
```

#### 7. Set Up Celery (Optional, for background tasks)

In separate terminal windows:

```bash
# Terminal 1: Redis (if not running as service)
redis-server

# Terminal 2: Celery Worker
cd backend
source venv/bin/activate
celery -A schoolhub worker -l info

# Terminal 3: Celery Beat (for scheduled tasks)
cd backend
source venv/bin/activate
celery -A schoolhub beat -l info
```

### Frontend Setup (React)

#### 1. Install Dependencies

```bash
cd frontend
npm install
```

#### 2. Set Up Environment Variables

Create a `.env` file in the `frontend` directory (optional for local dev):

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

#### 3. Run Development Server

```bash
npm run dev

# Server will be available at http://localhost:5173
# Vite will automatically proxy API requests
```

### Running the Application

1. **Start PostgreSQL** (if not running as service):
   ```bash
   # macOS (using Homebrew)
   brew services start postgresql@15
   
   # Linux
   sudo systemctl start postgresql
   
   # Or use Docker
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine
   ```

2. **Start Redis** (if not running as service):
   ```bash
   # macOS (using Homebrew)
   brew services start redis
   
   # Linux
   sudo systemctl start redis
   
   # Or use Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

3. **Start Backend**:
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py runserver
   ```

4. **Start Frontend** (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the Application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api
   - Admin Panel: http://localhost:8000/admin

## ☸️ Kubernetes Deployment

### Prerequisites

1. **Kubernetes Cluster**: 
   - Minikube: `minikube start`
   - Docker Desktop: Enable Kubernetes in settings
   - Cloud provider (GKE, EKS, AKS)

2. **Verify kubectl**:
   ```bash
   kubectl cluster-info
   ```

3. **Build Docker Images**:
   ```bash
   # Build backend image
   docker build -t school-hub-backend:latest ./backend
   
   # Build frontend image
   docker build -t school-hub-frontend:latest ./frontend
   
   # For Minikube, load images:
   minikube image load school-hub-backend:latest
   minikube image load school-hub-frontend:latest
   ```

### Deployment Steps

#### 1. Update Secrets

Edit the secret files in `k8s/` directory:

```bash
# Generate secure SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Edit backend secrets
nano k8s/backend-secret.yaml

# Edit PostgreSQL secrets
nano k8s/postgres-secret.yaml
```

**k8s/backend-secret.yaml** should contain all environment variables from [`.env.example`](./backend/.env.example), adapted for Kubernetes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
  namespace: school-hub
type: Opaque
stringData:
  SECRET_KEY: <your-secret-key>
  DEBUG: "False"
  ALLOWED_HOSTS: "*"
  TIME_ZONE: "Africa/Cairo"
  DB_NAME: schoolhub
  DB_USER: postgres
  DB_PASSWORD: <strong-password>
  DB_HOST: postgres
  DB_PORT: "5432"
  CORS_ALLOWED_ORIGINS: "https://yourdomain.com"
  CELERY_BROKER_URL: redis://redis:6379/1
  CELERY_RESULT_BACKEND: redis://redis:6379/1
  SMS_ENABLED: "False"
  SMS_API_KEY: ""
  SMS_USERNAME: ""
  SMS_SENDER_NAME: ""
  SMS_SENDER_NUMBER: ""
  WHATSAPP_ENABLED: "False"
```

> **Note**: Refer to [`.env.example`](./backend/.env.example) for complete list of environment variables and their descriptions.

**k8s/postgres-secret.yaml** should contain:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: school-hub
type: Opaque
stringData:
  POSTGRES_DB: schoolhub
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: <strong-password>
```

#### 2. Deploy Using Kustomize

```bash
cd k8s
kubectl apply -k .
```

#### 3. Or Deploy Using the Script

```bash
cd k8s
chmod +x deploy.sh
./deploy.sh
```

#### 4. Wait for Pods to be Ready

```bash
# Watch pods
kubectl get pods -n school-hub -w

# Check all resources
kubectl get all -n school-hub
```

Wait until all pods show `Running` status.

#### 5. Run Database Migrations

```bash
# Run migrations
kubectl exec -it deployment/backend -n school-hub -- python manage.py migrate

# Create superuser (optional)
kubectl exec -it deployment/backend -n school-hub -- python manage.py createsuperuser
```

### Accessing the Application

#### Option 1: Port Forwarding

```bash
# Frontend
kubectl port-forward -n school-hub service/frontend 3000:80

# Backend
kubectl port-forward -n school-hub service/backend 8000:8000
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin: http://localhost:8000/admin

#### Option 2: Ingress (Production)

If you've configured Ingress, access via the configured domain:

```bash
# Check ingress
kubectl get ingress -n school-hub
```

### Verify Deployment

```bash
# Check pod logs
kubectl logs -l app=backend -n school-hub
kubectl logs -l app=celery-worker -n school-hub
kubectl logs -l app=celery-beat -n school-hub

# Check services
kubectl get svc -n school-hub

# Check deployments
kubectl get deployments -n school-hub
```

## 🔐 Environment Variables

### Backend Environment Variables

All backend environment variables are documented in [`backend/.env.example`](./backend/.env.example) with detailed descriptions and comments.

**Quick Setup:**
```bash
# Copy the example file
cp backend/.env.example backend/.env

# Edit and update values
nano backend/.env
```

**Quick Reference:**

| Category | Variables | Required | Notes |
|----------|-----------|----------|-------|
| **Django Settings** | `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `TIME_ZONE` | ✅ Yes | See [`.env.example`](./backend/.env.example) |
| **Database** | `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | ✅ Yes | PostgreSQL connection |
| **CORS** | `CORS_ALLOWED_ORIGINS` | ⚠️ Production | Comma-separated URLs |
| **Celery** | `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | ✅ Yes | Redis URLs |
| **SMS (Optional)** | `SMS_ENABLED`, `SMS_API_KEY`, `SMS_USERNAME`, `SMS_SENDER_NAME`, `SMS_SENDER_NUMBER` | ❌ No | Mora SMS API |


> 📝 **For complete documentation**: See [`backend/.env.example`](./backend/.env.example) for all variables with detailed descriptions, default values, and usage notes.

### Frontend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | ❌ No | `/api` (dev) or `http://localhost:8000/api` |

Create a `.env` file in the `frontend` directory if you need to override the default API URL.

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured (see [`backend/.env.example`](./backend/.env.example) for complete list)
- [ ] SECRET_KEY generated and secure
- [ ] DEBUG set to `False` in production
- [ ] ALLOWED_HOSTS configured with production domain
- [ ] Database credentials are secure
- [ ] CORS_ALLOWED_ORIGINS configured for production
- [ ] Static files collected (`python manage.py collectstatic`)
- [ ] Database migrations applied
- [ ] Superuser created (if needed)
- [ ] SSL/TLS certificates configured (for production)
- [ ] Backup strategy in place

### Security

- [ ] Strong SECRET_KEY generated
- [ ] Database passwords are strong
- [ ] CORS properly configured
- [ ] HTTPS enabled (production)
- [ ] Secrets stored securely (not in code)
- [ ] API rate limiting considered
- [ ] Input validation in place

### Performance

- [ ] Static files served efficiently (CDN/nginx)
- [ ] Database indexes optimized
- [ ] Caching configured (Redis)
- [ ] Celery workers scaled appropriately
- [ ] Database connection pooling configured

### Monitoring

- [ ] Logging configured
- [ ] Error tracking set up
- [ ] Health checks configured
- [ ] Metrics collection set up
- [ ] Alerting configured

## 🔧 Troubleshooting

### Common Issues

#### Backend Issues

**Database Connection Error:**
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
# Verify DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env
```

**Migration Errors:**
```bash
# Reset migrations (CAUTION: Only in development)
python manage.py migrate --fake-initial

# Or rollback and reapply
python manage.py migrate <app_name> zero
python manage.py migrate
```

**Static Files Not Found:**
```bash
# Collect static files
python manage.py collectstatic --noinput

# Check STATIC_ROOT in settings.py
```

**Celery Not Working:**
```bash
# Check Redis is running
redis-cli ping

# Check Celery broker URL
# Verify CELERY_BROKER_URL in .env
```

#### Frontend Issues

**API Connection Error:**
```bash
# Check VITE_API_BASE_URL in .env
# Verify backend is running on correct port
# Check CORS settings in backend
```

**Build Errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

#### Kubernetes Issues

**Pods Not Starting:**
```bash
# Check pod status
kubectl describe pod <pod-name> -n school-hub

# Check logs
kubectl logs <pod-name> -n school-hub

# Check events
kubectl get events -n school-hub --sort-by='.lastTimestamp'
```

**Database Connection Issues:**
```bash
# Check PostgreSQL pod
kubectl logs -l app=postgres -n school-hub

# Verify service
kubectl get svc postgres -n school-hub

# Test connection
kubectl exec -it deployment/backend -n school-hub -- python manage.py dbshell
```

**Image Pull Errors:**
```bash
# For Minikube, load images locally
minikube image load school-hub-backend:latest
minikube image load school-hub-frontend:latest

# Or use image registry
docker tag school-hub-backend:latest <registry>/school-hub-backend:latest
docker push <registry>/school-hub-backend:latest
```

## 📁 Project Structure

```
School Hub/
├── backend/                 # Django backend
│   ├── attendance/          # Attendance app
│   ├── core/               # Core app (students, parents, branches)
│   ├── schoolhub/          # Django project settings
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── entrypoint.sh
├── frontend/               # React frontend
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── locales/       # i18n translations
│   ├── package.json
│   ├── Dockerfile
│   └── vite.config.js
├── k8s/                    # Kubernetes manifests
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── postgres-deployment.yaml
│   ├── redis-deployment.yaml
│   └── ...
├── docker-compose.yml      # Docker Compose configuration
├── Makefile               # Make commands
└── README.md              # This file
```

## 📚 Additional Documentation

- [Kubernetes Deployment Guide](./KUBERNETES_DEPLOYMENT.md) - Detailed Kubernetes deployment instructions
- [Celery Setup Guide](./CELERY_SETUP.md) - Celery configuration and setup
- [Device Network Setup](./DEVICE_NETWORK_SETUP.md) - Fingerprint device network configuration
- [Fingerprint Device Setup](./FINGERPRINT_DEVICE_SETUP.md) - Device setup instructions
- [WhatsApp Setup](./WHATSAPP_SETUP.md) - WhatsApp integration setup
- [Troubleshooting Connectivity](./TROUBLESHOOTING_CONNECTIVITY.md) - Network troubleshooting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support, please contact the development team or open an issue in the repository.

---

**Last Updated**: 2025
**Version**: 1.0.0

