# Observability Implementation Guide

This guide covers how to implement and configure observability tools for the Todo application and the broader Internal Developer Platform, including OpenTelemetry, Prometheus, Grafana, and Jaeger.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Observability Architecture](#observability-architecture)
3. [Application Instrumentation](#application-instrumentation)
   - [Backend Instrumentation](#backend-instrumentation)
   - [Frontend Instrumentation](#frontend-instrumentation)
4. [Platform Monitoring](#platform-monitoring)
5. [Deploying the Observability Stack](#deploying-the-observability-stack)
6. [Accessing Dashboards](#accessing-dashboards)
7. [Custom Metrics](#custom-metrics)
8. [Integration with the Developer Platform](#integration-with-the-developer-platform)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (EKS, GKE, or local like Minikube)
- kubectl configured to access your cluster
- Terraform (version 1.0+)
- Node.js and npm

## Observability Architecture

The observability stack consists of the following components:

1. **OpenTelemetry**: For instrumenting applications and collecting telemetry data
2. **Prometheus**: For storing and querying metrics
3. **Grafana**: For visualizing metrics and creating dashboards
4. **Jaeger**: For distributed tracing
5. **OpenTelemetry Collector**: For receiving, processing, and exporting telemetry data

These components work together to provide a comprehensive view of application and platform health:

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Frontend    │     │    Backend    │     │  Platform     │
│  Application  │     │    Services   │     │  Components   │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│                  OpenTelemetry SDK                      │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│               OpenTelemetry Collector                   │
└─────────────────┬─────────────────┬─────────────────────┘
                  │                 │
         ┌────────┘                 └────────┐
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   Prometheus    │                 │     Jaeger      │
└────────┬────────┘                 └─────────────────┘
         │
         ▼
┌─────────────────┐
│     Grafana     │
└─────────────────┘
```

## Application Instrumentation

### Backend Instrumentation

#### 1. Install Required Packages

```bash
cd backend
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-prometheus @opentelemetry/exporter-trace-otlp-http @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/sdk-trace-base prom-client
```

#### 2. Add Tracing Configuration

Create a `tracing.js` file in your backend directory with the OpenTelemetry configuration:

```javascript
// tracing.js
'use strict';

const process = require('process');
const opentelemetry = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// Create a simple resource attributes object
const resourceAttributes = {
  'service.name': 'todo-backend',
  'deployment.environment': process.env.NODE_ENV || 'development',
};

// For traces
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector.monitoring:4318/v1/traces',
});

// Create and register the SDK
const sdk = new opentelemetry.NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
  ],
  resourceAttributes: resourceAttributes,
});

// Initialize the SDK
try {
  sdk.start();
  console.log('OpenTelemetry tracing initialized');
} catch (error) {
  console.log('Error initializing OpenTelemetry', error);
}

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  try {
    sdk.shutdown();
    console.log('OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.log('Error shutting down OpenTelemetry SDK', error);
  } finally {
    process.exit(0);
  }
});

module.exports = sdk;
```

#### 3. Update Server Code

Update your `server.js` to import the tracing module and add custom metrics:

```javascript
// First load tracing - must be first import
require('./tracing');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const promClient = require('prom-client');

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// Create a Registry to register the metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Register the metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestCounter);

// Middleware to track request duration and count
app.use((req, res, next) => {
  const start = Date.now();
  
  // Add a 'end' listener to track the response
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Skip metrics endpoint itself
    if (req.path !== '/metrics') {
      const route = req.route ? req.route.path : req.path;
      
      // Record metrics
      httpRequestDurationMicroseconds
        .labels(req.method, route, res.statusCode)
        .observe(duration / 1000); // Convert to seconds
      
      httpRequestCounter
        .labels(req.method, route, res.statusCode)
        .inc();
    }
  });
  
  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Rest of your server code...
```

### Frontend Instrumentation

#### 1. Install Required Packages

```bash
cd frontend
npm install @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/exporter-trace-otlp-http @opentelemetry/context-zone @opentelemetry/instrumentation-document-load @opentelemetry/instrumentation-fetch @opentelemetry/instrumentation-xml-http-request
```

#### 2. Add Tracing Configuration

Create a `tracing.js` file in your frontend source directory:

```javascript
// src/tracing.js
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Configure the trace exporter
const traceExporter = new OTLPTraceExporter({
  url: process.env.REACT_APP_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

// Create and configure the OpenTelemetry provider
const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'todo-frontend',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
});

// Configure span processor to send spans to the exporter
provider.addSpanProcessor(new BatchSpanProcessor(traceExporter));

// Register your auto-instrumentations
registerInstrumentations({
  instrumentations: [
    // Instruments document load events
    new DocumentLoadInstrumentation(),
    // Instruments fetch API calls
    new FetchInstrumentation({
      ignoreUrls: [/\/sockjs-node/], // Ignore dev server websocket
      propagateTraceHeaderCorsUrls: [
        new RegExp(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/*`),
      ],
    }),
    // Instruments XMLHttpRequest API calls
    new XMLHttpRequestInstrumentation({
      ignoreUrls: [/\/sockjs-node/],
      propagateTraceHeaderCorsUrls: [
        new RegExp(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/*`),
      ],
    }),
  ],
  tracerProvider: provider,
});

// Register the provider
provider.register({
  contextManager: new ZoneContextManager(),
});

console.log('OpenTelemetry tracing initialized for frontend');

export default provider;
```

#### 3. Update Application Code

Import the tracing module in your entry point (main.jsx or index.js):

```jsx
import './tracing'; // Import tracing first
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## Platform Monitoring

In addition to application monitoring, we also monitor the platform components:

### 1. Monitor Kubernetes Components

Update your Prometheus configuration to scrape Kubernetes components:

```yaml
# kubernetes/monitoring/prometheus-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
      - job_name: 'prometheus'
        static_configs:
          - targets: ['localhost:9090']

      - job_name: 'kubernetes-nodes'
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
          insecure_skip_verify: true
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        kubernetes_sd_configs:
          - role: node
        relabel_configs:
          - action: labelmap
            regex: __meta_kubernetes_node_label_(.+)
          - target_label: __address__
            replacement: kubernetes.default.svc:443
          - source_labels: [__meta_kubernetes_node_name]
            regex: (.+)
            target_label: __metrics_path__
            replacement: /api/v1/nodes/${1}/proxy/metrics

      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
            target_label: __address__
          - action: labelmap
            regex: __meta_kubernetes_pod_label_(.+)
          - source_labels: [__meta_kubernetes_namespace]
            action: replace
            target_label: kubernetes_namespace
          - source_labels: [__meta_kubernetes_pod_name]
            action: replace
            target_label: kubernetes_pod_name
```

### 2. Monitor ArgoCD

Add ArgoCD to your monitoring:

```yaml
# Add to prometheus-configmap.yaml
- job_name: 'argocd'
  kubernetes_sd_configs:
    - role: pod
      namespaces:
        names:
          - argocd
  relabel_configs:
    - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
      action: keep
      regex: argocd-server|argocd-repo-server|argocd-application-controller
    - action: labelmap
      regex: __meta_kubernetes_pod_label_(.+)
    - source_labels: [__meta_kubernetes_namespace]
      action: replace
      target_label: kubernetes_namespace
    - source_labels: [__meta_kubernetes_pod_name]
      action: replace
      target_label: kubernetes_pod_name
```

### 3. Monitor Backstage

Add Backstage to your monitoring:

```yaml
# Add to prometheus-configmap.yaml
- job_name: 'backstage'
  kubernetes_sd_configs:
    - role: pod
      namespaces:
        names:
          - platform
  relabel_configs:
    - source_labels: [__meta_kubernetes_pod_label_app]
      action: keep
      regex: backstage
    - action: labelmap
      regex: __meta_kubernetes_pod_label_(.+)
    - source_labels: [__meta_kubernetes_namespace]
      action: replace
      target_label: kubernetes_namespace
    - source_labels: [__meta_kubernetes_pod_name]
      action: replace
      target_label: kubernetes_pod_name
```

## Deploying the Observability Stack

### 1. Create the Monitoring Namespace

```bash
kubectl apply -f kubernetes/monitoring/monitoring-namespace.yaml
```

### 2. Deploy OpenTelemetry Collector

```bash
kubectl apply -f kubernetes/monitoring/otel-collector-config.yaml
kubectl apply -f kubernetes/monitoring/otel-collector-deployment.yaml
```

### 3. Deploy Prometheus

```bash
kubectl apply -f kubernetes/monitoring/prometheus-configmap.yaml
kubectl apply -f kubernetes/monitoring/prometheus-deployment.yaml
```

### 4. Deploy Grafana

```bash
kubectl apply -f kubernetes/monitoring/grafana-deployment.yaml
```

### 5. Deploy Jaeger

```bash
kubectl apply -f kubernetes/monitoring/jaeger-deployment.yaml
```

### 6. Deploy Monitoring Ingress

```bash
kubectl apply -f kubernetes/monitoring/monitoring-ingress.yaml
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

4. **Platform Component Health**: Monitors platform components
   - Various metrics from ArgoCD, Backstage, and Kubernetes

## Integration with the Developer Platform

The observability stack is integrated with the developer platform components:

### 1. Backstage Integration

Backstage provides links to relevant dashboards for each service. Update your Backstage catalog entities:

```yaml
# backstage/catalog/todo-backend.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: todo-backend
  annotations:
    backstage.io/techdocs-ref: dir:.
    grafana/dashboard-selector: "todo-backend-dashboard"
    grafana/alert-label-selector: "service=todo-backend"
    grafana/tag-selector: "todo,backend"
# ...rest of the configuration
```

### 2. ArgoCD Integration

Add links to observability dashboards in ArgoCD applications:

```yaml
# kubernetes/platform/argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: todo-app
  annotations:
    argocd-cm.argoproj.io/prometheus-url: "http://prometheus.monitoring.svc.cluster.local:9090"
    argocd-cm.argoproj.io/grafana-url: "http://grafana.monitoring.svc.cluster.local:3000"
# ...rest of the configuration
```

### 3. Create Platform Dashboards

Create a dedicated dashboard for the platform components in Grafana:

```yaml
# kubernetes/monitoring/grafana-dashboards-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: platform-dashboards
  namespace: monitoring
data:
  platform-dashboard.json: |
    {
      "annotations": {
        "list": [
          {
            "builtIn": 1,
            "datasource": "-- Grafana --",
            "enable": true,
            "hide": true,
            "iconColor": "rgba(0, 211, 255, 1)",
            "name": "Annotations & Alerts",
            "type": "dashboard"
          }
        ]
      },
      "editable": true,
      "gnetId": null,
      "graphTooltip": 0,
      "id": 2,
      "links": [],
      "panels": [
        # ...dashboard JSON configuration
      ],
      "refresh": "10s",
      "schemaVersion": 25,
      "style": "dark",
      "tags": ["platform"],
      "title": "Platform Dashboard",
      "uid": "platform-dashboard",
      "version": 1
    }
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

4. **Platform components not being monitored**
   - Verify the Prometheus configuration includes scrape configs for platform components
   - Check if the components have the correct annotations for scraping
   - Use `kubectl get servicemonitors -n monitoring` to check ServiceMonitor configuration

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

# View ArgoCD logs
kubectl logs -n argocd deployment/argocd-server

# View Backstage logs
kubectl logs -n platform deployment/backstage
```

### Checking Configuration

```bash
# Check Prometheus configuration
kubectl get configmap prometheus-config -n monitoring -o yaml

# Check OpenTelemetry Collector configuration
kubectl get configmap otel-collector-config -n monitoring -o yaml

# Check Grafana datasources
kubectl get configmap grafana-datasources -n monitoring -o yaml
```

### Validating Metrics Endpoints

```bash
# Port-forward Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Use curl to check metrics endpoints
curl http://localhost:9090/api/v1/targets
```

For more detailed information on OpenTelemetry, refer to the [official documentation](https://opentelemetry.io/docs/).