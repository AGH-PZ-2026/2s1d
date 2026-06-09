import { HTTPException } from "hono/http-exception";

export class AppError extends HTTPException {
  constructor(status: number, detail: string) {
    super(status, { message: detail });
  }
}

export function notFound(detail: string): never {
  throw new AppError(404, detail);
}

export function badRequest(detail: string): never {
  throw new AppError(400, detail);
}

export function forbidden(detail: string): never {
  throw new AppError(403, detail);
}

export function unauthorized(detail: string = "Unauthorized"): never {
  throw new AppError(401, detail);
}
