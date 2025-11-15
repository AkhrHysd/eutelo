export class Command {
  constructor(definition?: string);
  name(value: string): this;
  description(value: string): this;
  option(flag: string, description?: string): this;
  command(definition: string): Command;
  action(handler: (...args: any[]) => any): this;
  parseAsync(argv: string[]): Promise<void>;
}
