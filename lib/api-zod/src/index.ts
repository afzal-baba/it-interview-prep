import type { z } from "zod";
import type { GetCurrentAuthUserResponse } from "./generated/api";

export * from "./generated/api";

// Authenticated user shape, derived from the generated auth envelope
export type AuthUser = NonNullable<
  z.infer<typeof GetCurrentAuthUserResponse>["user"]
>;
