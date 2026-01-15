import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";

const DEFAULT_USER_EMAIL = "local@studybuddy.ai";
const DEFAULT_USER_NAME = "Local User";

export async function getOrCreateDefaultUserId() {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEFAULT_USER_EMAIL))
    .limit(1);

  if (existing.length) return existing[0].id;

  const [created] = await db
    .insert(users)
    .values({ email: DEFAULT_USER_EMAIL, name: DEFAULT_USER_NAME })
    .returning({ id: users.id });

  return created.id;
}
