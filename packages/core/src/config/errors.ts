export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ConfigFileNotFoundError extends ConfigError {
  readonly path: string;

  constructor(path: string) {
    super(`Config file not found: ${path}`);
    this.name = 'ConfigFileNotFoundError';
    this.path = path;
  }
}

export class ConfigParseError extends ConfigError {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`Failed to parse config file (${path}): ${message}`);
    this.name = 'ConfigParseError';
    this.path = path;
  }
}

export class ConfigValidationError extends ConfigError {
  readonly pathOrPreset?: string;

  constructor(message: string, pathOrPreset?: string) {
    super(pathOrPreset ? `${message} (${pathOrPreset})` : message);
    this.name = 'ConfigValidationError';
    this.pathOrPreset = pathOrPreset;
  }
}
