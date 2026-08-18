let cachedApp;

export default async function handler(req, res) {
  if (!cachedApp) {
    const mod = await import('../backend/dist/index.js');
    cachedApp = mod.default || mod;
  }
  return cachedApp(req, res);
}
