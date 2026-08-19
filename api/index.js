let cachedApp;

export default async function handler(req, res) {
  try {
    if (!cachedApp) {
      const mod = await import('../backend/dist/index.js');
      cachedApp = mod.default || mod;
    }
    return cachedApp(req, res);
  } catch (err) {
    console.error('[Vercel Serverless Handler Error]', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'Server initialization failed',
    });
  }
}
