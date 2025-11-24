# Documentation for Developers

[日本語](DEVELOPERS.jp.md) | English

Commands and procedures used for development of this repository.

## Build and Test

```bash
npm run build    # Build all packages
npm run clean    # Remove build artifacts
npm test         # Build and then run tests
```

## Dependency Management

```bash
npm run deps:publish  # Convert dependencies to publish format (version numbers)
npm run deps:local    # Convert dependencies to local development format (file:)
```

## Package Publishing

```bash
# Publish core packages
npm run publish:core

# Publish plugin packages
npm run publish:plugins

# Publish CLI package
npm run publish:cli

# Publish meta package
npm run publish:meta

# Publish all packages
npm run publish:all
```
