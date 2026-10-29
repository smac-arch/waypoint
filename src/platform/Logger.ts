type SafeContext = { stopId?: string };
type LogEvent =
  | 'stop.scan_verified'
  | 'stop.proof_uploaded'
  | 'stop.completed'
  | 'stop.action_failed';

// MDS-4 lint policy — Mobile Data Storage & Encryption Standard MDS-4: stop IDs only.
// Allowlist rather than denylist: new personal-data fields stay redacted by default.
export function redact(context: Record<string, unknown>): SafeContext {
  const { stopId } = context;
  return typeof stopId === 'string' &&
    /^stop[-_][a-zA-Z0-9_-]{1,72}$/.test(stopId)
    ? { stopId }
    : {};
}

export class Logger {
  constructor(
    private readonly sink: (event: LogEvent, context: SafeContext) => void = (
      event,
      context,
    ) => {
      // eslint-disable-next-line no-console -- Only static events and allowlisted IDs.
      console.info(event, context);
    },
  ) {}

  info(event: LogEvent, context: Record<string, unknown>): void {
    this.sink(event, redact(context));
  }
}
