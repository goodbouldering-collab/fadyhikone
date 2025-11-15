// Cloudflare Pages Functions Middleware
export const onRequest: PagesFunction = async (context) => {
  // D1 binding is automatically available in context.env.DB
  return await context.next();
};
