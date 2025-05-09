# Todo Application with Observability and Cloud Deployment

This repository contains a full-stack Todo application with comprehensive observability tooling and cloud deployment configurations. The application consists of a React frontend, Node.js/Express backend, and MongoDB database.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Observability Setup](#observability-setup)
- [Cloud Deployment](#cloud-deployment)
- [GitOps with ArgoCD](#gitops-with-argocd)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

![Architecture Diagram](https://via.placeholder.com/800x400?text=Todo+App+Architecture)

The application consists of:

- **Frontend**: React application with OpenTelemetry instrumentation
- **Backend**: Node.js/Express API with MongoDB integration and OpenTelemetry instrumentation
- **Database**: MongoDB for data persistence
- **Observability Stack**:
  - OpenTelemetry for instrumentation
  - Prometheus for metrics collection
  - Grafana for visualization
  - Jaeger for distributed tracing
- **Deployment**:
  - Docker for containerization
  - Kubernetes for orchestration
  - Terraform for infrastructure provisioning
  - Helm for application deployment
  - Istio for service mesh capabilities

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Terraform](https://www.terraform.io/downloads.html) (v1.0+)
- [Helm](https://helm.sh/docs/intro/install/)
- [AWS CLI](https://aws.amazon.com/cli/) (configured with appropriate permissions)
- [Istioctl](https://istio.io/latest/docs/setup/getting-started/#download) (optional, for service mesh)

## Local Development

### Clone the Repository

```bash
git clone https://github.com/yourusername/todo-app.git
cd todo-app
```

### Start with Docker Compose

The easiest way to run the application locally is using Docker Compose:

```bash
docker compose up
```

This will start the frontend, backend, and MongoDB services. The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Manual Setup

If you prefer to run the services individually:

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### MongoDB

You can either use a local MongoDB installation or run it with Docker:

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Observability Setup

For detailed observability setup instructions, refer to [observability.md](observability.md).

### Quick Setup

To deploy the observability stack locally using Kubernetes (requires Minikube or similar):

```bash
# Start Minikube
minikube start

# Create monitoring namespace
kubectl apply -f kubernetes/monitoring-namespace.yaml

# Deploy monitoring components
kubectl apply -f kubernetes/monitoring/prometheus-deployment.yaml
kubectl apply -f kubernetes/monitoring/grafana-deployment.yaml
kubectl apply -f kubernetes/monitoring/otel-collector-deployment.yaml
kubectl apply -f kubernetes/monitoring/jaeger-deployment.yaml

# Deploy ingress for monitoring tools
kubectl apply -f kubernetes/monitoring/monitoring-ingress.yaml
```

### Accessing Dashboards

After deployment, you can access the dashboards at:

- Grafana: http://grafana.monitoring.local (Default credentials: admin/admin123)
- Prometheus: http://prometheus.monitoring.local
- Jaeger: http://jaeger.monitoring.local

Note: You may need to add entries to your hosts file to resolve these domains locally.

## Cloud Deployment

### Deployment Demo

Below are screenshots of the application deployment and monitoring dashboards:

#### Application Frontend
![Todo App Frontend](https://via.placeholder.com/800x400?text=Todo+App+Frontend)

#### Grafana Dashboard
![Grafana Dashboard](https://via.placeholder.com/800x400?text=Grafana+Dashboard)

#### Jaeger Tracing
![Jaeger Tracing](https://via.placeholder.com/800x400?text=Jaeger+Tracing)

> Note: These are placeholder images. In a real submission, you would include actual screenshots of your running application and dashboards.

### Infrastructure Provisioning with Terraform

```bash
# Initialize Terraform
cd terraform
terraform init

# Preview changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan
```

This will provision:
- VPC with public and private subnets
- EKS cluster
- IAM roles and policies
- Load balancer controller

### Kubernetes Deployment with Helm

After the infrastructure is provisioned, configure kubectl to use the new cluster:

```bash
aws eks update-kubeconfig --name todo-app-cluster --region us-east-1
```

Deploy the application using Helm:

```bash
# For development environment
helm install todo-app ./charts/todo-app -f ./charts/todo-app/values-dev.yaml -n dev

# For production environment
helm install todo-app ./charts/todo-app -f ./charts/todo-app/values-prod.yaml -n prod
```

## GitOps with ArgoCD

For continuous deployment using GitOps principles:

1. Install ArgoCD on your Kubernetes cluster:

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

2. Apply the application manifest:

```bash
kubectl apply -f application-prod.yaml
```

This will synchronize your application with the Git repository, ensuring the deployed state matches the desired state in Git.

## Project Structure

```
todo-app/
├── backend/                # Node.js Express backend
│   ├── Dockerfile
│   ├── server.js
│   ├── tracing.js          # OpenTelemetry configuration
│   └── package.json
├── frontend/               # React frontend
│   ├── Dockerfile
│   ├── src/
│   │   ├── App.jsx
│   │   ├── TodoList.jsx
│   │   └── tracing.js      # OpenTelemetry configuration
│   └── package.json
├── kubernetes/             # Kubernetes configuration files
│   ├── dev/                # Development environment
│   ├── prod/               # Production environment
│   └── monitoring/         # Observability stack
├── terraform/              # Terraform infrastructure as code
│   ├── main.tf
│   └── variables.tf
├── charts/                 # Helm charts
│   └── todo-app/
│       ├── templates/
│       ├── values.yaml
│       ├── values-dev.yaml
│       └── values-prod.yaml
├── compose.yaml            # Docker Compose for local development
└── observability.md        # Observability setup documentation
```

## Deployment Verification

To verify a successful deployment without actual AWS resources, you can follow these steps:

1. **Validate Terraform Configuration**
   ```bash
   cd terraform
   terraform validate
   ```
   This will check that your Terraform files are syntactically correct and internally consistent.

2. **Validate Kubernetes Resources**
   ```bash
   # Validate Helm charts
   helm lint ./charts/todo-app
   
   # Check Kubernetes manifests
   kubectl apply --dry-run=client -f kubernetes/dev/
   kubectl apply --dry-run=client -f kubernetes/prod/
   ```

3. **Run Local Simulations**
   You can use tools like [localstack](https://github.com/localstack/localstack) for AWS services and [kind](https://kind.sigs.k8s.io/) or [minikube](https://minikube.sigs.k8s.io/) for Kubernetes to test your configurations locally.

4. **Document Expected Results**
   In a production environment, the application would be accessible via the load balancer URL provided by the AWS ALB Ingress Controller:
   - Frontend: https://prod.myapp.local
   - Monitoring: https://grafana.monitoring.local, https://prometheus.monitoring.local, https://jaeger.monitoring.local

## Troubleshooting

### Common Issues

1. **Application not starting locally**
   - Check if MongoDB is running and accessible
   - Verify environment variables are set correctly
   - Check for port conflicts

2. **OpenTelemetry not sending data**
   - Ensure the OTEL_EXPORTER_OTLP_ENDPOINT is correctly set
   - Check if the OpenTelemetry Collector is running
   - Verify network connectivity between components

3. **Terraform errors during provisioning**
   - Verify AWS credentials are configured correctly
   - Check if the specified AWS region supports all required services
   - Ensure you have sufficient permissions to create resources

4. **Kubernetes deployment issues**
   - Check pod logs: `kubectl logs -n <namespace> <pod-name>`
   - Describe pods to see events: `kubectl describe pod -n <namespace> <pod-name>`
   - Verify that ConfigMaps and Secrets exist and are correct

For more detailed troubleshooting guidance, refer to the [observability.md](observability.md) file.

## License

This project is licensed under the MIT License - see the LICENSE file for details.