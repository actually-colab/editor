export const AC_REST_MIDDLEWARE_OPTS = {
  HttpErrorHandlerOpts: { catchAllErrors: true },
  HttpCorsOpts: {
    allowHeaders: 'Authorization',
    allowedOrigins: ['http://localhost:4000', 'https://app.actuallycolab.org'],
  },
};
