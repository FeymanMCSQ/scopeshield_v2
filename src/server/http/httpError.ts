/**
 * httpError
 * Owns: transport-safe errors with explicit HTTP status.
 * Does NOT own: domain rules.
 * Layer: Application (edge support)
 */

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
