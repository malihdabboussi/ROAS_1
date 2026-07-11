import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseClientFactory } from '../services/supabase-client.factory';
import { SupabaseJwtVerifierService } from '../services/supabase-jwt-verifier.service';
import { SupabaseServiceClient } from '../services/supabase-service-client.provider';
import { UserSessionMintService } from '../services/user-session-mint.service';
export declare class AuthGuard implements CanActivate {
    private readonly reflector;
    private readonly verifier;
    private readonly supabaseClientFactory;
    private readonly supabaseServiceClient;
    private readonly userSessionMint;
    private readonly logger;
    private readonly impersonationRoleCache;
    private readonly impersonationTargetCache;
    constructor(reflector: Reflector, verifier: SupabaseJwtVerifierService, supabaseClientFactory: SupabaseClientFactory, supabaseServiceClient: SupabaseServiceClient, userSessionMint: UserSessionMintService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private applyImpersonation;
    private extractBearerToken;
}
