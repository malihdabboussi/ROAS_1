import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { UserRole } from '@vibey/api-shared'
import { UsersRepository } from '../repositories/users.repository'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string) {
    const { data, error } = await this.usersRepository.getUserProfile(userId)

    if (error || !data) {
      // Auto-create profile if missing
      const { data: created, error: createErr } =
        await this.usersRepository.createUserProfile(userId)

      if (createErr) {
        this.logger.error(`Failed to create profile for ${userId}: ${createErr.message}`)
        throw new NotFoundException('User profile not found')
      }
      return created
    }

    return data
  }

  async setRole(userId: string, role: UserRole) {
    const { data, error } = await this.usersRepository.setUserRole(
      userId,
      role,
      new Date().toISOString(),
    )

    if (error || !data) {
      throw new NotFoundException(`User ${userId} not found`)
    }

    this.logger.log(`Role updated: ${userId} → ${role}`)
    return data
  }
}
