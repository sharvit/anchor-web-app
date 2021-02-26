import { configErrorBoundary } from '@anchor-protocol/neumorphism-ui/components/configErrorBoundary';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { SENTRY_DSN } from 'env';
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from 'App';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [new Integrations.BrowserTracing()],

    tracesSampleRate: 1.0,
  });

  configErrorBoundary(Sentry.ErrorBoundary);
}

ReactDOM.render(<App isDemo />, document.getElementById('root'));
