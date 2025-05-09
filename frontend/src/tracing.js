// src/tracing.js
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { defaultResource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const resource = defaultResource();

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