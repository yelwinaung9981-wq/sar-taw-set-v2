let cachedHandler: any = null;
let loadError: any = null;

async function getHandler() {
  if (cachedHandler) return cachedHandler;
  if (loadError) throw loadError;

  try {
    // Dynamically load server.ts inside an execution context
    const imported = await import('../server');
    cachedHandler = imported.default || imported;
    return cachedHandler;
  } catch (err: any) {
    loadError = err;
    console.error("Vercel backend module loading failed:", err);
    throw err;
  }
}

export default async function vercelHandler(req: any, res: any) {
  try {
    const handler = await getHandler();
    return handler(req, res);
  } catch (err: any) {
    res.status(500).json({
      error: "Vercel backend module loading failed.",
      message: err?.message || String(err),
      stack: err?.stack || "",
      name: err?.name || "Error"
    });
  }
}

