"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UserSessionMintService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSessionMintService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_service_client_provider_1 = require("./supabase-service-client.provider");
const EXPIRY_MARGIN_SECONDS = 120;
let UserSessionMintService = UserSessionMintService_1 = class UserSessionMintService {
    supabaseServiceClient;
    logger = new common_1.Logger(UserSessionMintService_1.name);
    cache = new Map();
    mintInFlight = new Map();
    anonClient = null;
    constructor(supabaseServiceClient) {
        this.supabaseServiceClient = supabaseServiceClient;
    }
    async mintAccessToken(userId, email) {
        const cached = this.cache.get(userId);
        const now = Math.floor(Date.now() / 1000);
        if (cached && cached.expiresAt > now + EXPIRY_MARGIN_SECONDS) {
            return cached.accessToken;
        }
        if (cached?.refreshToken) {
            const refreshed = await this.tryRefresh(cached.refreshToken);
            if (refreshed) {
                this.cache.set(userId, refreshed);
                return refreshed.accessToken;
            }
        }
        const existing = this.mintInFlight.get(userId);
        if (existing) {
            const session = await existing;
            return session.accessToken;
        }
        const promise = this.generateViaGoTrue(userId, email);
        this.mintInFlight.set(userId, promise);
        try {
            const session = await promise;
            this.cache.set(userId, session);
            return session.accessToken;
        }
        finally {
            this.mintInFlight.delete(userId);
        }
    }
    getAnonClient() {
        if (this.anonClient)
            return this.anonClient;
        const url = process.env.SUPABASE_URL;
        const anonKey = process.env.SUPABASE_ANON_KEY;
        if (!url || !anonKey) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
        }
        this.anonClient = (0, supabase_js_1.createClient)(url, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        return this.anonClient;
    }
    async tryRefresh(refreshToken) {
        try {
            const { data, error } = await this.getAnonClient().auth.refreshSession({
                refresh_token: refreshToken,
            });
            if (error || !data.session)
                return null;
            return {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token ?? refreshToken,
                expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
            };
        }
        catch {
            return null;
        }
    }
    async resolveEmail(userId) {
        const { data, error } = await this.supabaseServiceClient.client.auth.admin.getUserById(userId);
        if (error || !data?.user?.email) {
            throw new Error(`Session mint: failed to resolve user ${userId}: ${error?.message ?? 'no email on account'}`);
        }
        return data.user.email;
    }
    async generateViaGoTrue(userId, emailHint) {
        const email = emailHint ?? (await this.resolveEmail(userId));
        const { data: linkData, error: linkError } = await this.supabaseServiceClient.client.auth.admin.generateLink({
            type: 'magiclink',
            email,
        });
        if (linkError || !linkData?.properties?.email_otp) {
            throw new Error(`Session mint: failed to generate link for ${userId}: ${linkError?.message ?? 'no OTP returned'}`);
        }
        const { data: session, error: otpError } = await this.getAnonClient().auth.verifyOtp({
            email,
            token: linkData.properties.email_otp,
            type: 'magiclink',
        });
        if (otpError || !session?.session?.access_token) {
            throw new Error(`Session mint: OTP exchange failed for ${userId}: ${otpError?.message ?? 'no session returned'}`);
        }
        this.logger.log(`Minted session for user ${userId}`);
        return {
            accessToken: session.session.access_token,
            refreshToken: session.session.refresh_token ?? '',
            expiresAt: session.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
        };
    }
};
exports.UserSessionMintService = UserSessionMintService;
exports.UserSessionMintService = UserSessionMintService = UserSessionMintService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_client_provider_1.SupabaseServiceClient])
], UserSessionMintService);
//# sourceMappingURL=user-session-mint.service.js.map