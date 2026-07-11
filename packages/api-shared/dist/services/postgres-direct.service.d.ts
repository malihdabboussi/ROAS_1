import { OnModuleDestroy } from '@nestjs/common';
export declare class PostgresDirectService implements OnModuleDestroy {
    private readonly logger;
    private pool;
    private getConnectionString;
    private getPool;
    hasConnectionString(): boolean;
    query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{
        rows: T[];
        rowCount: number | null;
    }>;
    withClient<T>(fn: (client: any) => Promise<T>): Promise<T>;
    withTransaction<T>(fn: (client: any) => Promise<T>): Promise<T>;
    withMissionAdvisoryLock<T>(missionId: string, fn: () => Promise<T>): Promise<T>;
    onModuleDestroy(): Promise<void>;
}
