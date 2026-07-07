import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const Supabase = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request.supabase
})
