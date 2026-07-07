export type FireEmployeeHandoffInput =
  | { scope: 'default' }
  | { scope: 'agent'; agent_key: string }
  | { scope: 'campaign'; campaign_id: string }
