#!/bin/bash

# School Hub Kubernetes Deployment Script
# This script helps deploy the School Hub application to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="school-hub"
REGISTRY=""  # Set this if using a container registry

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install it first."
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    print_info "Prerequisites check passed!"
}

build_images() {
    print_info "Building Docker images..."
    
    if [ -z "$REGISTRY" ]; then
        print_warn "No registry specified. Building images locally."
        print_info "Building backend image..."
        docker build -t school-hub-backend:latest ./backend
        
        print_info "Building frontend image..."
        docker build -t school-hub-frontend:latest ./frontend
        
        # For Minikube
        if command -v minikube &> /dev/null && minikube status &> /dev/null; then
            print_info "Loading images into Minikube..."
            minikube image load school-hub-backend:latest
            minikube image load school-hub-frontend:latest
        fi
    else
        print_info "Building and pushing images to registry: $REGISTRY"
        docker build -t ${REGISTRY}/school-hub-backend:latest ./backend
        docker push ${REGISTRY}/school-hub-backend:latest
        
        docker build -t ${REGISTRY}/school-hub-frontend:latest ./frontend
        docker push ${REGISTRY}/school-hub-frontend:latest
        
        # Update image references in deployment files
        print_info "Updating image references in deployment files..."
        find . -name "*-deployment.yaml" -exec sed -i '' "s|school-hub-backend:latest|${REGISTRY}/school-hub-backend:latest|g" {} \;
        find . -name "*-deployment.yaml" -exec sed -i '' "s|school-hub-frontend:latest|${REGISTRY}/school-hub-frontend:latest|g" {} \;
    fi
}

deploy_resources() {
    print_info "Deploying Kubernetes resources..."
    
    # Create namespace
    print_info "Creating namespace..."
    kubectl apply -f namespace.yaml
    
    # Deploy PostgreSQL
    print_info "Deploying PostgreSQL..."
    kubectl apply -f postgres-configmap.yaml
    kubectl apply -f postgres-secret.yaml
    kubectl apply -f postgres-pvc.yaml
    kubectl apply -f postgres-deployment.yaml
    
    # Wait for PostgreSQL
    print_info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE} --timeout=120s || {
        print_error "PostgreSQL failed to start"
        exit 1
    }
    
    # Deploy Redis
    print_info "Deploying Redis..."
    kubectl apply -f redis-deployment.yaml
    
    # Wait for Redis
    print_info "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n ${NAMESPACE} --timeout=60s || {
        print_error "Redis failed to start"
        exit 1
    }
    
    # Deploy Backend
    print_info "Deploying Backend..."
    kubectl apply -f backend-configmap.yaml
    kubectl apply -f backend-secret.yaml
    kubectl apply -f backend-deployment.yaml
    
    # Wait for Backend
    print_info "Waiting for Backend to be ready..."
    kubectl wait --for=condition=ready pod -l app=backend -n ${NAMESPACE} --timeout=120s || {
        print_warn "Backend may still be starting. Check logs if issues occur."
    }
    
    # Deploy Celery
    print_info "Deploying Celery Worker and Beat..."
    kubectl apply -f celery-worker-deployment.yaml
    kubectl apply -f celery-beat-deployment.yaml
    
    # Deploy Frontend
    print_info "Deploying Frontend..."
    kubectl apply -f frontend-deployment.yaml
    
    # Deploy Ingress (optional)
    if [ -f ingress.yaml ]; then
        print_info "Deploying Ingress..."
        kubectl apply -f ingress.yaml
    fi
}

show_status() {
    print_info "Deployment Status:"
    echo ""
    kubectl get all -n ${NAMESPACE}
    echo ""
    
    print_info "Pod Status:"
    kubectl get pods -n ${NAMESPACE}
    echo ""
    
    print_info "Service Status:"
    kubectl get services -n ${NAMESPACE}
}

show_access_info() {
    print_info "Access Information:"
    echo ""
    
    # Check for LoadBalancer
    LB_IP=$(kubectl get service frontend -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ ! -z "$LB_IP" ]; then
        print_info "Frontend LoadBalancer IP: http://${LB_IP}"
    fi
    
    # Check for Ingress
    INGRESS_HOST=$(kubectl get ingress -n ${NAMESPACE} -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")
    if [ ! -z "$INGRESS_HOST" ]; then
        print_info "Ingress Host: http://${INGRESS_HOST}"
    fi
    
    echo ""
    print_info "To access via port-forward:"
    echo "  Frontend: kubectl port-forward -n ${NAMESPACE} service/frontend 3000:80"
    echo "  Backend:  kubectl port-forward -n ${NAMESPACE} service/backend 8000:8000"
    echo ""
    print_info "To view logs:"
    echo "  kubectl logs -l app=backend -n ${NAMESPACE}"
    echo "  kubectl logs -l app=frontend -n ${NAMESPACE}"
}

# Main execution
main() {
    echo "=========================================="
    echo "  School Hub Kubernetes Deployment"
    echo "=========================================="
    echo ""
    
    # Parse arguments
    BUILD_IMAGES=false
    SKIP_BUILD=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --build)
                BUILD_IMAGES=true
                shift
                ;;
            --registry)
                REGISTRY="$2"
                BUILD_IMAGES=true
                shift 2
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Usage: $0 [--build] [--registry <registry-url>] [--skip-build]"
                exit 1
                ;;
        esac
    done
    
    check_prerequisites
    
    if [ "$SKIP_BUILD" = false ] && [ "$BUILD_IMAGES" = true ]; then
        build_images
    elif [ "$SKIP_BUILD" = false ]; then
        read -p "Build Docker images? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            build_images
        fi
    fi
    
    deploy_resources
    
    echo ""
    print_info "Waiting for all pods to be ready..."
    sleep 10
    
    show_status
    show_access_info
    
    echo ""
    print_info "Deployment complete!"
    print_warn "Remember to update secrets with secure values before production use!"
}

# Run main function
main "$@"

