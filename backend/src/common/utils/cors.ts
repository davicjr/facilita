import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export type CorsOriginResolution =
  | { mode: 'wildcard'; warning: string }
  | { mode: 'explicit'; origins: string[] };

/**
 * Falha fechado por design: CORS_ORIGIN vazio derruba o boot em vez de assumir
 * um default permissivo. Wildcard ("*"/"0.0.0.0") só é aceito fora de produção,
 * já que credentials:true + wildcard permitiria qualquer site fazer requests
 * autenticados.
 */
export const resolveCorsOrigin = (
  corsOrigin: string | undefined,
  nodeEnv: string | undefined,
): CorsOriginResolution => {
  if (!corsOrigin) {
    throw new Error(
      'CORS_ORIGIN environment variable must be set explicitly (fails closed by design — see /davi-core:security).',
    );
  }

  const isWildcard = corsOrigin === '*' || corsOrigin === '0.0.0.0';

  if (isWildcard && nodeEnv === 'production') {
    throw new Error(
      'CORS_ORIGIN cannot be "*" when NODE_ENV=production — credentials are enabled, so a wildcard origin allows any site to make authenticated requests. Set explicit origin(s).',
    );
  }

  if (isWildcard) {
    return {
      mode: 'wildcard',
      warning:
        '⚠️  CORS_ORIGIN is "*" with credentials enabled — every origin can send authenticated requests. Only acceptable outside production.',
    };
  }

  return {
    mode: 'explicit',
    origins: corsOrigin.split(',').map((origin) => origin.trim()),
  };
};

export const buildCorsOptions = (
  corsOrigin: string | undefined,
  nodeEnv: string | undefined,
): CorsOptions => {
  const resolution = resolveCorsOrigin(corsOrigin, nodeEnv);

  if (resolution.mode === 'wildcard') {
    // eslint-disable-next-line no-console
    console.warn(resolution.warning);
  }

  return {
    origin:
      resolution.mode === 'wildcard'
        ? (
            _origin: string | undefined,
            callback: (err: Error | null, allow?: boolean) => void,
          ) => callback(null, true)
        : resolution.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  };
};
