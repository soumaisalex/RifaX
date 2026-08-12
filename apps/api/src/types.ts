import type { AuthSession } from "./middleware/auth";

export type AppBindings = {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  APP_ENV?: string;
};

export type AppVariables = {
  auth: AuthSession;
};

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthSession;
  }
}
