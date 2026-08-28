import { showErrorToast } from "./toast";

export type ErrorType = "network" | "contract" | "validation" | "unknown";

export class AppError extends Error {
  readonly type: ErrorType;
  readonly context: string;
  readonly timestamp: number;
  readonly originalError: unknown;

  constructor(params: {
    type: ErrorType;
    context: string;
    message: string;
    originalError?: unknown;
  }) {
    super(params.message);
    this.name = "AppError";
    this.type = params.type;
    this.context = params.context;
    this.timestamp = Date.now();
    this.originalError = params.originalError;
  }
}

/**
 * Categorizes an unknown thrown value into a high-level `ErrorType`.
 *
 * Classification order:
 * 1. An `AppError` returns its own `type`.
 * 2. A `TypeError` or any `Error` whose message mentions "network", "fetch",
 *    or "timeout" is treated as a network error.
 * 3. Any `Error` whose message mentions "invalid", "required", or
 *    "not connected" is treated as a validation error.
 * 4. Anything else is treated as a contract error.
 *
 * @param err - The unknown thrown value to classify.
 * @returns The `ErrorType` category for the error: `"network"`, `"contract"`,
 *   `"validation"`, or `"unknown"`.
 *   - `"network"` — An `AppError` typed as network, a `TypeError`, or an
 *     `Error` mentioning "network", "fetch", or "timeout".
 *   - `"validation"` — An `AppError` typed as validation, or an `Error`
 *     mentioning "invalid", "required", or "not connected".
 *   - `"contract"` — Any other `Error` or unrecognized value.
 *   - `"unknown"` — Only reachable when an `AppError` itself carries the
 *     `"unknown"` type.
 */
export function classifyError(err: unknown): ErrorType {
  if (err instanceof AppError) return err.type;
  if (err instanceof TypeError) return "network";
  if (
    err instanceof Error &&
    (err.message.toLowerCase().includes("network") ||
      err.message.toLowerCase().includes("fetch") ||
      err.message.toLowerCase().includes("timeout"))
  ) {
    return "network";
  }
  if (
    err instanceof Error &&
    (err.message.toLowerCase().includes("invalid") ||
      err.message.toLowerCase().includes("required") ||
      err.message.toLowerCase().includes("not connected"))
  ) {
    return "validation";
  }
  return "contract";
}

function extractMessage(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unexpected error occurred";
}

const KNOWN_ERRORS: Record<string, string> = {
  "Wallet not connected": "Please connect your wallet to perform this action",
};

/**
 * Extracts a human-readable message string from an unknown error value.
 *
 * Resolves the message in this order: the `message` of an `AppError`, the
 * `message` of a generic `Error`, the value itself when it is a string, or the
 * provided `fallback` for everything else.
 *
 * @param error - The unknown error value to extract a message from.
 * @param fallback - The message to return when the error carries no usable
 *   message. Defaults to `'An unexpected error occurred'`.
 * @returns A message string describing the error.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred",
): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

/**
 * Returns a user-friendly message for an error, mapped through known errors.
 *
 * First resolves the raw message with `getErrorMessage`, then replaces it with
 * the friendlier wording from `KNOWN_ERRORS` when a match exists. Unknown
 * messages pass through unchanged.
 *
 * @param error - The unknown error value to map to a user-friendly message.
 * @returns A message string suitable for display to the user. This is the
 *   mapped message for a known error, otherwise the raw extracted message.
 */
export function getUserFriendlyMessage(error: unknown): string {
  const message = getErrorMessage(error);
  return KNOWN_ERRORS[message] || message;
}

/**
 * Creates an error-handling helper scoped to a given context.
 *
 * Returns three functions that share the same `context` string, used to
 * classify errors, build `AppError` instances, and (optionally) surface them
 * as toast notifications. Intended to be created once per module, e.g.
 * `const { captureError } = createErrorHandler("useProfile")`.
 *
 * @param context - A label identifying where the errors originate. It is
 *   embedded in the log output of `captureError` and attached to every
 *   `AppError` produced by the returned helpers.
 * @returns An object with three error-handling functions:
 *   - `captureError(error)` — Classifies the error, logs a timestamped,
 *     context-prefixed message to the console, and returns a new `AppError`
 *     wrapping the error.
 *     - `@param error` — The unknown thrown value to capture.
 *     - `@returns` — The constructed `AppError` carrying the classified
 *       `type`, the `context`, an extracted `message`, and the original error.
 *   - `handleError(error, action?)` — Calls `captureError` and, when an
 *     `action` is supplied, shows an error toast naming that action, then
 *     returns the `AppError` so the caller can propagate it.
 *     - `@param error` — The unknown thrown value to handle.
 *     - `@param action` — Optional description of the action that failed,
 *       used as the toast title.
 *     - `@returns` — The constructed `AppError` produced by `captureError`.
 *   - `handleMutationError(error, action)` — Calls `captureError` and always
 *     shows an error toast naming the action; returns nothing.
 *     - `@param error` — The unknown thrown value to handle.
 *     - `@param action` — Description of the mutation that failed, used as the
 *       toast title.
 */
export function createErrorHandler(context: string) {
  function captureError(error: unknown) {
    const type = classifyError(error);
    const message = extractMessage(error);
    console.error(
      `[${new Date().toISOString()}] [${context}] [${type}] ${message}`,
      error,
    );
    return new AppError({ type, context, message, originalError: error });
  }

  function handleError(error: unknown, action?: string): AppError {
    const appError = captureError(error);
    if (action) {
      showErrorToast(action, appError);
    }
    return appError;
  }

  function handleMutationError(error: unknown, action: string) {
    const appError = captureError(error);
    showErrorToast(action, appError);
  }

  return { captureError, handleError, handleMutationError };
}
