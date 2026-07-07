import { adminGet } from '@/lib/api/admin-client'
import type { UsersResponse } from '../types/users.types'

export async function fetchUsers(): Promise<UsersResponse> {
  return adminGet<UsersResponse>('users')
}
