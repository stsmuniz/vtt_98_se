import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
    url: 'https://faro-collector-prod-sa-east-1.grafana.net/collect/b27cdb5724a1376ac45ccec9f810d9b3',
    app: {
        name: 'vtt-98-se',
        version: process.env.VERCEL_DEPLOYMENT_ID || '1.0.0',
        environment: process.env.NUXT_PUBLIC_VERCEL_ENV || 'development',
    },
    instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
});
