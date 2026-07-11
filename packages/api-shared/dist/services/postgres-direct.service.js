"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PostgresDirectService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresDirectService = void 0;
const common_1 = require("@nestjs/common");
let PgPool = null;
try {
    PgPool = require('pg').Pool;
}
catch {
    PgPool = null;
}
let PostgresDirectService = PostgresDirectService_1 = class PostgresDirectService {
    logger = new common_1.Logger(PostgresDirectService_1.name);
    pool = null;
    getConnectionString() {
        const url = process.env.SUPABASE_DIRECT_DB_URL || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
        if (!url) {
            throw new Error('Missing SUPABASE_DIRECT_DB_URL (or SUPABASE_DB_URL / DATABASE_URL)');
        }
        return url;
    }
    getPool() {
        if (!this.pool) {
            if (!PgPool)
                throw new Error('pg module is not installed — cannot create direct Postgres pool');
            this.pool = new PgPool({
                connectionString: this.getConnectionString(),
                max: Number(process.env.SUPABASE_DIRECT_DB_POOL_MAX || 20),
                idleTimeoutMillis: Number(process.env.SUPABASE_DIRECT_DB_IDLE_MS || 30000),
                connectionTimeoutMillis: Number(process.env.SUPABASE_DIRECT_DB_CONNECT_TIMEOUT_MS || 10000),
                ssl: { rejectUnauthorized: false },
            });
            this.logger.log('Native Postgres direct pool initialized');
        }
        return this.pool;
    }
    hasConnectionString() {
        return !!(process.env.SUPABASE_DIRECT_DB_URL ||
            process.env.SUPABASE_DB_URL ||
            process.env.DATABASE_URL);
    }
    async query(text, values) {
        return this.getPool().query(text, values);
    }
    async withClient(fn) {
        const client = await this.getPool().connect();
        try {
            return await fn(client);
        }
        finally {
            client.release();
        }
    }
    async withTransaction(fn) {
        return this.withClient(async (client) => {
            await client.query('BEGIN');
            try {
                const result = await fn(client);
                await client.query('COMMIT');
                return result;
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        });
    }
    async withMissionAdvisoryLock(missionId, fn) {
        if (!this.hasConnectionString() || !PgPool) {
            return fn();
        }
        return this.withClient(async (client) => {
            await client.query('SELECT pg_advisory_lock(abs(hashtext($1::text))::bigint)', [missionId]);
            try {
                return await fn();
            }
            finally {
                await client.query('SELECT pg_advisory_unlock(abs(hashtext($1::text))::bigint)', [
                    missionId,
                ]);
            }
        });
    }
    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
};
exports.PostgresDirectService = PostgresDirectService;
exports.PostgresDirectService = PostgresDirectService = PostgresDirectService_1 = __decorate([
    (0, common_1.Injectable)()
], PostgresDirectService);
//# sourceMappingURL=postgres-direct.service.js.map