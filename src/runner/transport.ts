export type IllustratorTransport = 'osascript';

export interface TransportExecution {
  executable: string;
  args: string[];
  timeoutMs: number;
}
