import assert from 'node:assert/strict';
import { SpanStatusCode } from '@opentelemetry/api';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';

const exporter = new InMemorySpanExporter();
const provider = new TracerProvider({
  spanProcessors: [new SimpleSpanProcessor({ exporter })],
});
const tracer = provider.getTracer('handbook-example');
const span = tracer.startSpan('checkout.validate');
try {
  span.setAttribute('item.count', 2);
  span.setStatus({ code: SpanStatusCode.OK });
} finally {
  span.end();
}

await provider.forceFlush();
const spans = exporter.getFinishedSpans();
assert.equal(spans.length, 1);
assert.equal(spans[0]?.name, 'checkout.validate');
assert.equal(spans[0]?.attributes['item.count'], 2);
await provider.shutdown();
console.log('Trace exported to the in-memory test exporter.');
