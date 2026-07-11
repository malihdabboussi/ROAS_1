"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgContext = void 0;
const common_1 = require("@nestjs/common");
exports.OrgContext = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return {
        userId: request.user?.id,
        orgId: request.orgId ?? null,
        orgRole: request.orgRole ?? null,
    };
});
//# sourceMappingURL=org-context.decorator.js.map