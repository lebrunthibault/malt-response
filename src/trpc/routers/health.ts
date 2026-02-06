import { baseProcedure, createTRPCRouter } from '../init';

export const healthRouter = createTRPCRouter({
  check: baseProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase.from('profiles').select('count').limit(0);
    return {
      status: 'ok' as const,
      database: error ? 'error' : 'connected',
      auth: ctx.user ? 'authenticated' : 'anonymous',
      timestamp: new Date(),
    };
  }),
});
