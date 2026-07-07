export interface MissionErrorMessageRule {
  pattern: RegExp
  message: string
}

export const MISSION_ERROR_MESSAGES: MissionErrorMessageRule[] = [
  {
    pattern: /^Tool error:/i,
    message: 'The agent could not complete a web or tool step — we may need a different approach',
  },
  {
    pattern: /(EACCES|permission denied)/i,
    message: 'The agent runtime hit a permissions issue on our side — retrying',
  },
  {
    pattern: /mkdir\s*['"]?\/Users/i,
    message: 'The agent runtime misconfigured a path — we are fixing it',
  },
  {
    pattern: /Gateway connection error/i,
    message: 'Lost connection to the agent runtime, retrying',
  },
  {
    pattern: /(openclaw|agent) request failed \(5\d{2}\)/i,
    message: 'Ran into a small issue, trying again now',
  },
  {
    pattern: /(OpenClaw|Agent) gateway error \(\d{3}\)/i,
    message: 'Ran into a small issue, trying again now',
  },
  {
    pattern: /"retryable":\s*true/i,
    message: 'Service is briefly unavailable, trying again now',
  },
  {
    pattern: /(fetch failed|econnreset|econnrefused)/i,
    message: 'Lost connection for a sec, getting back on it',
  },
  {
    pattern: /timed out/i,
    message: 'This is taking longer than usual, let me try again',
  },
  {
    pattern: /plan creation api failed/i,
    message: 'Had trouble saving the plan, going again',
  },
  {
    pattern: /invalid json response/i,
    message: 'Got an unexpected response, let me try that again',
  },
  {
    pattern: /not executable from status "blocked"/i,
    message: 'Still waiting on the previous step to finish',
  },
  {
    pattern: /subtask .* not found/i,
    message: "Can't find the task I was assigned, retrying",
  },
]

export const MISSION_ERROR_FINAL =
  "Tried a few times but couldn't get this done. Flagging it for you to check"

export const MISSION_ERROR_DEFAULT = 'Something went wrong on my end, retrying'
