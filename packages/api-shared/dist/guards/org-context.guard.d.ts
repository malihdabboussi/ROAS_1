import { CanActivate, ExecutionContext } from '@nestjs/common';
import { SupabaseServiceClient } from '../services/supabase-service-client.provider';
export declare class OrgContextGuard implements CanActivate {
    private readonly serviceClient;
    private readonly logger;
    constructor(serviceClient: SupabaseServiceClient);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
