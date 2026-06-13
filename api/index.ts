import app from '../server';

export default function vercelHandler(req: any, res: any) {
  return app(req, res);
}

