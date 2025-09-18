import type { User } from "@/../generated/prisma/index.js";

export type UserWithoutId = Partial<Pick<User, "id">> & Omit<User, "id">;
