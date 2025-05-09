# Todo Modern Internal Developer Platform

This repository contains the implementation of a Modern Internal Developer Platform (IDP) built around a Todo application.

## Platform Components

### Developer Portal (Backstage)

Our Backstage instance serves as the central hub for developers to discover and interact with our services. It provides:

- Service catalog
- API documentation
- Technical documentation
- Service templates

### GitOps with Argo CD

We follow GitOps principles using Argo CD:

- Infrastructure and application configuration stored in Git
- Automated synchronization between Git and the cluster
- Self-healing capabilities
- Deployment history and rollback

### Policy Enforcement with OPA/Gatekeeper

We enforce organizational policies using OPA/Gatekeeper:

- Resource requirements
- Security policies
- Labeling standards
- Best practices

### Observability

Comprehensive observability is provided through:

- Prometheus for metrics collection
- Grafana for visualization
- Jaeger for distributed tracing
- OpenTelemetry for instrumentation

## Getting Started

### Prerequisites

- Kubernetes cluster (EKS, GKE, or local like Minikube)
- kubectl configured to access your cluster
- Helm
- ArgoCD CLI (optional)

### Installation

1. Create the platform namespace:
   ```bash
   kubectl apply -f kubernetes/platform/platform-namespace.yaml