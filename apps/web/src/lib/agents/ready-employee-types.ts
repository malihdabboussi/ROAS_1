export interface ReadyEmployeeSkillProfile {
  skill_key: string
  name: string
  description: string
}

export interface ReadyEmployeeProfile {
  role_key: string
  template_key: string
  skill_seed_key: string
  default_name: string
  name_pool: string[]
  role: string
  level: 'employee' | 'manager' | 'c_level'
  disc_profile: string
  tagline: string
  description: string
  responsibilities: string[]
  skills: string[]
  core_beliefs: string[]
  image_url: string
  skill_profiles: ReadyEmployeeSkillProfile[]
}
