export interface ServiceConfig {
  serviceName: string;
  port: number;
}

export function parseServiceConfig(input: unknown): ServiceConfig {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('Configuration must be an object.');
  }

  if (
    !('serviceName' in input) ||
    typeof input.serviceName !== 'string' ||
    input.serviceName.trim().length === 0
  ) {
    throw new Error('serviceName must be a non-empty string.');
  }

  if (
    !('port' in input) ||
    typeof input.port !== 'number' ||
    !Number.isInteger(input.port) ||
    input.port < 1 ||
    input.port > 65535
  ) {
    throw new Error('port must be an integer between 1 and 65535.');
  }

  return { serviceName: input.serviceName.trim(), port: input.port };
}
