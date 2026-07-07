/** Subtask was cancelled or reassigned while OpenClaw streaming; abort without triage/blocked. */
export class SubtaskExecutionInvalidatedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubtaskExecutionInvalidatedError'
  }
}

/** Application-level OpenResponses failure that should not trigger HTTP retry storms. */
export class OpenClawNonRetryableError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'OpenClawNonRetryableError'
    this.code = code
  }
}
