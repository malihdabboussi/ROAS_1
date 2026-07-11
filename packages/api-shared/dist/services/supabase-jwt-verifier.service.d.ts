import { type JWTPayload } from 'jose';
export type VerifiedSupabaseClaims = {
    sub: string;
    email: string;
    payload: JWTPayload;
};
export declare class SupabaseJwtVerifierService {
    private readonly logger;
    private readonly jwksCache;
    private getJwksResolver;
    verify(token: string, supabaseUrl: string): Promise<VerifiedSupabaseClaims>;
}
