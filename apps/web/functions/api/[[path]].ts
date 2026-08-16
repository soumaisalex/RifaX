interface Env {
  API: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith("/api/")) return context.next();

  const upstream = new Request(context.request);
  return context.env.API.fetch(upstream);
};
