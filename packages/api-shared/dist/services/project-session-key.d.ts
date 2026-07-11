export declare function deriveProjectSessionKey(projectId: string, rootSecret: string | undefined): string;
export declare function verifyProjectSessionKey(projectId: string, sessionKey: string | undefined, rootSecret: string | undefined): boolean;
