# Observability Implementation Guide

This guide covers how to implement and configure observability tools for the Todo application, including OpenTelemetry, Prometheus, Grafana, and Jaeger.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Instrumentation](#backend-instrumentation)
3. [Frontend Instrumentation](#frontend-instrumentation)
4. [Deploying the Observability Stack](#deploying-the-observability-stack)
5. [Accessing Dashboards](#accessing-dashboards)
6. [Custom Metrics](#custom-metrics)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (EKS, GKE, or local like Minikube)
- kubectl configured to access your cluster
- Terraform (version 1.0+)
- Node.js and npm

## Backend Instrumentation

### 1. Install Required Packages

```bash
cd backend
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-prometheus @opentelemetry/exporter-trace-otlp-http @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/sdk-trace-base prom-client
```

### 2. Add Tracing Configuration

Create a `tracing.js` file in your backend directory with the OpenTelemetry configuration provided. This sets up:
- Automatic instrumentation for Node.js, Express, MongoDB, and HTTP
- Prometheus metrics export
- Trace export to Jaeger

### 3. Update Server Code

Update your `server.js` to:
- Import the tracing module at the top of the file
- Add custom Prometheus metrics for HTTP request duration and count
- Add middleware to track these metrics for each request

## Frontend Instrumentation

### 1. Install Required Packages

```bash
cd frontend
npm install @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/exporter-trace-otlp-http @opentelemetry/context-zone @opentelemetry/instrumentation-document-load @opentelemetry/instrumentation-fetch @opentelemetry/instrumentation-xml-http-request
```

### 2. Add Tracing Configuration

Create a `tracing.js` file in your frontend source directory with the provided configuration. This sets up:
- Web tracer for browser-side tracing
- Automatic instrumentation for document loading, fetch API, and XMLHttpRequest
- Trace export to the OpenTelemetry collector

### 3. Update Application Code

- Import the tracing module in your entry point (main.jsx)
- Add manual instrumentation in your TodoList component for key user actions

## Deploying the Observability Stack

### 1. Create the Monitoring Namespace

```bash
kubectl apply -f monitoring-namespace.yaml
```

### 2. Deploy Prometheus

```bash
kubectl apply -f prometheus-configmap.yaml
kubectl apply -f prometheus-deployment.yaml
```

### 3. Deploy Grafana

```bash
kubectl apply -f grafana-deployment.yaml
```

### 4. Deploy OpenTelemetry Collector

```bash
kubectl apply -f otel-collector-config.yaml
kubectl apply -f otel-collector-deployment.yaml
```

### 5. Deploy Jaeger

```bash
kubectl apply -f jaeger-deployment.yaml
```

### 6. Deploy Monitoring Ingress

```bash
kubectl apply -f monitoring-ingress.yaml
```

### 7. Update Application Deployments

Update your frontend and backend deployments with the provided YAML configurations:

```bash
kubectl apply -f updated-backend-deployment.yaml
kubectl apply -f updated-frontend-deployment.yaml
```

## Accessing Dashboards

### Grafana

- URL: http://grafana.monitoring.local (add to your hosts file)
- Default credentials: admin / admin123
- The Todo App Dashboard should be available by default

### Prometheus

- URL: http://prometheus.monitoring.local

### Jaeger

- URL: http://jaeger.monitoring.local

## Custom Metrics

The implementation includes the following custom metrics:

1. **HTTP Request Duration**: Measures how long HTTP requests take to complete
   - Metric name: `http_request_duration_seconds`
   - Labels: method, route, status_code
   
2. **HTTP Request Counter**: Counts the number of HTTP requests
   - Metric name: `http_requests_total`
   - Labels: method, route, status_code

3. **Event Loop Lag**: Monitors Node.js event loop performance
   - Metric name: `nodejs_eventloop_lag_seconds`

## Creating Additional Custom Metrics

To add more custom metrics:

1. Define the metric in your server.js:

```javascript
const customMetric = new promClient.Gauge({
  name: 'custom_metric_name',
  help: 'Description of the metric',
  labelNames: ['label1', 'label2']
});

register.registerMetric(customMetric);
```

2. Update the metric in your code:

```javascript
customMetric.set({ label1: 'value1', label2: 'value2' }, 123);
```

## Terraform Deployment

To deploy the infrastructure to AWS using Terraform:

1. Initialize Terraform:

```bash
cd terraform
terraform init
```

2. Plan the deployment:

```bash
terraform plan -out=tfplan
```

3. Apply the configuration:

```bash
terraform apply tfplan
```

4. Configure kubectl to use the new cluster:

```bash
aws eks update-kubeconfig --name todo-app-cluster --region us-east-1
```

5. Deploy the application and observability components:

```bash
kubectl apply -f ../kubernetes/
```

## Troubleshooting

### Common Issues

1. **Metrics not showing in Prometheus**
   - Check if the backend service is properly annotated with `prometheus.io/scrape: "true"`
   - Verify the pods are running: `kubectl get pods -n monitoring`
   - Check Prometheus logs: `kubectl logs -n monitoring deployment/prometheus`

2. **Traces not appearing in Jaeger**
   - Ensure the OpenTelemetry Collector is running: `kubectl get pods -n monitoring`
   - Check the OTEL_EXPORTER_OTLP_ENDPOINT environment variable in your backend deployment
   - Verify Jaeger is running: `kubectl logs -n monitoring deployment/jaeger`

3. **Grafana dashboards not loading**
   - Check if Grafana can connect to Prometheus: Verify the datasource configuration
   - Check Grafana logs: `kubectl logs -n monitoring deployment/grafana`

### Viewing Logs

```bash
# View Prometheus logs
kubectl logs -n monitoring deployment/prometheus

# View Grafana logs
kubectl logs -n monitoring deployment/grafana

# View OpenTelemetry Collector logs
kubectl logs -n monitoring deployment/otel-collector

# View Jaeger logs
kubectl logs -n monitoring deployment/jaeger
```