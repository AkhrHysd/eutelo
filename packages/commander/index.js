class Command {
  constructor(definition = '') {
    this._parent = null;
    this._children = [];
    this._action = null;
    this._options = [];
    this._description = '';
    this._displayName = '';
    this._rawDefinition = definition.trim();
    const parts = this._rawDefinition.split(/\s+/).filter(Boolean);
    this.commandName = parts[0] ?? null;
    this.argDefinitions = parts.slice(1).filter((part) => part.startsWith('<') && part.endsWith('>'));
  }

  name(value) {
    this._displayName = value;
    return this;
  }

  description(value) {
    this._description = value;
    return this;
  }

  option(flag) {
    const normalized = flag.replace(/^--/, '').replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    this._options.push(normalized);
    return this;
  }

  command(definition) {
    const child = new Command(definition);
    child._parent = this;
    this._children.push(child);
    return child;
  }

  action(handler) {
    this._action = handler;
    return this;
  }

  async parseAsync(argv) {
    const args = argv.slice(2);
    await this._dispatch(args);
  }

  async _dispatch(args) {
    if (this._children.length > 0) {
      if (args.length === 0) {
        this._printHelp();
        return;
      }
      const [next, ...rest] = args;
      const child = this._children.find((cmd) => cmd.commandName === next);
      if (!child) {
        process.stderr.write(`Unknown command: ${next}\n`);
        process.exitCode = 1;
        return;
      }
      await child._dispatch(rest);
      return;
    }

    try {
      const { positional, options } = this._parseArgs(args);
      if (!this._action) {
        this._printHelp();
        return;
      }
      if (this.argDefinitions.length === 0) {
        await this._action(options);
      } else {
        await this._action(...positional);
      }
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  }

  _parseArgs(args) {
    const required = this.argDefinitions.length;
    const positional = args.slice(0, required);
    if (positional.length < required) {
      throw new Error(`Missing required arguments for command ${this.commandName ?? this._displayName}`);
    }
    const optionTokens = args.slice(required);
    const options = {};
    for (const token of optionTokens) {
      if (token.startsWith('--')) {
        const key = token
          .replace(/^--/, '')
          .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        options[key] = true;
      }
    }
    return { positional, options };
  }

  _printHelp() {
    const usage = [this._buildCommandPath(), ...this.argDefinitions].join(' ').trim();
    process.stdout.write(`Usage: ${usage || this._displayName || 'command'}\n`);
  }

  _buildCommandPath() {
    const names = [];
    let current = this;
    while (current) {
      if (current.commandName) {
        names.unshift(current.commandName);
      }
      current = current._parent;
    }
    return names.join(' ');
  }
}

export { Command };
