import { ThrottlerGuard } from '@nestjs/throttler';
export declare class OrgThrottlerGuard extends ThrottlerGuard {
    protected getTracker(req: Record<string, any>): Promise<string>;
}
