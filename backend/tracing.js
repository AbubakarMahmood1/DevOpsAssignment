// tracing.js - Basic Approach
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
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
});

// Create and register the SDK
const sdk = new opentelemetry.NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
  ],
  resourceAttributes: resourceAttributes,
});

// Initialize the SDK without using Promises
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