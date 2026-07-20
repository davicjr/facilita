import { buildCorsOptions, resolveCorsOrigin } from './cors';

describe('resolveCorsOrigin', () => {
  it('falha fechado quando CORS_ORIGIN está vazio', () => {
    expect(() => resolveCorsOrigin(undefined, 'development')).toThrow(
      /must be set explicitly/,
    );
    expect(() => resolveCorsOrigin('', 'development')).toThrow(
      /must be set explicitly/,
    );
  });

  it('bloqueia wildcard ("*") em produção', () => {
    expect(() => resolveCorsOrigin('*', 'production')).toThrow(
      /cannot be "\*" when NODE_ENV=production/,
    );
  });

  it('bloqueia "0.0.0.0" em produção (mesmo tratamento de wildcard)', () => {
    expect(() => resolveCorsOrigin('0.0.0.0', 'production')).toThrow(
      /cannot be "\*" when NODE_ENV=production/,
    );
  });

  it('permite wildcard fora de produção', () => {
    const resolution = resolveCorsOrigin('*', 'development');
    expect(resolution).toEqual({
      mode: 'wildcard',
      warning: expect.stringContaining('CORS_ORIGIN is "*"'),
    });
  });

  it('permite wildcard quando NODE_ENV não está definido', () => {
    const resolution = resolveCorsOrigin('*', undefined);
    expect(resolution.mode).toBe('wildcard');
  });

  it('separa e faz trim de múltiplas origens explícitas', () => {
    const resolution = resolveCorsOrigin(
      ' https://app.exemplo.com , https://admin.exemplo.com ',
      'production',
    );
    expect(resolution).toEqual({
      mode: 'explicit',
      origins: ['https://app.exemplo.com', 'https://admin.exemplo.com'],
    });
  });
});

describe('buildCorsOptions', () => {
  it('gera opções com credentials habilitado e métodos esperados', () => {
    const options = buildCorsOptions('https://app.exemplo.com', 'production');

    expect(options.credentials).toBe(true);
    expect(options.origin).toEqual(['https://app.exemplo.com']);
    expect(options.methods).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ]);
  });

  it('em modo wildcard, origin é uma função que sempre libera', () => {
    const options = buildCorsOptions('*', 'development');
    const originFn = options.origin as (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => void;

    const callback = jest.fn();
    originFn('https://qualquer-site.com', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('propaga o erro fail-closed do resolveCorsOrigin', () => {
    expect(() => buildCorsOptions(undefined, 'production')).toThrow(
      /must be set explicitly/,
    );
  });
});
