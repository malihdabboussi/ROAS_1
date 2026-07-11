import { SupabaseServiceClient } from './supabase-service-client.provider';
export declare class UserSessionMintService {
    private readonly supabaseServiceClient;
    private readonly logger;
    private readonly cache;
    private readonly mintInFlight;
    private anonClient;
    constructor(supabaseServiceClient: SupabaseServiceClient);
    mintAccessToken(userId: string, email?: string): Promise<string>;
    private getAnonClient;
    private tryRefresh;
    private resolveEmail;
    private generateViaGoTrue;
}
