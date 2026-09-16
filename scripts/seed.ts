/**
 * Seeds the author profile, an initial admin user (from env), and empty editorial collections.
 * Idempotent. Does NOT create poems — poems come only from real sources via `npm run import:run`.
 */
import { loadEnv } from "./env"; loadEnv();
import { eq } from "drizzle-orm";
import { db, pgClient } from "../src/infrastructure/db/client";
import { adminUsers, authors, collections, settings } from "../src/infrastructure/db/schema";
import { hashPassword } from "../src/infrastructure/auth/password";
import { AUTHOR_PROFILES } from "../src/domain/poem/types";

const COLLECTIONS = [
  ["love", "Love", "First love, distance, and what remains after."],
  ["loss", "Loss", "Grief that is too quiet for tears."],
  ["identity", "Identity", "Who I was, who I am, and the space between."],
  ["solitude", "Solitude", "Rooms, silences, and being alone with oneself."],
  ["healing", "Healing", "Slow recoveries and small returns."],
  ["hope", "Hope", "Small lights on long roads."],
  ["life", "Life", "Growing up, leaving, and everything in between."],
  ["memory", "Memory", "The things that stayed behind."],
  ["philosophy", "Philosophy", "Questions asked at midnight."],
  ["nature", "Nature", "Skies, pines, tides, and the quiet earth."],
  ["relationships", "Relationships", "Friends, family, and the ones who drifted."],
  ["society", "Society", "Messages to the world."],
  ["existence", "Existence", "Death, God, and the road toward eternity."],
  ["hindi", "हिंदी कविताएँ", "Poems written in Hindi."],
] as const;

async function main() {
  const existing = await db.query.authors.findFirst({ where: eq(authors.slug, "dev-parth") });
  if (!existing) {
    await db.insert(authors).values({
      slug: "dev-parth", name: "Dev Parth",
      bio: "I am a poet who writes about the emotions people don't always say out loud — first love, distance, growing up, and the quiet heartbreak that doesn't make noise but changes everything.",
      statement: "This site is Dev Parth's personal archive: every poem here was written by him and first published on the platforms linked below. Nothing has been rewritten or edited by machine.",
      links: [
        { label: "Poetry.com", url: AUTHOR_PROFILES.POETRY_COM, kind: "POETRY_COM" },
        { label: "My Poetic Side", url: AUTHOR_PROFILES.MY_POETIC_SIDE, kind: "MY_POETIC_SIDE" },
      ],
    });
    console.log("✔ author created");
  }
  for (const [slug, title, description] of COLLECTIONS) {
    await db.insert(collections).values({ slug, title, description, isPublished: true, sortOrder: COLLECTIONS.findIndex((c) => c[0] === slug) }).onConflictDoNothing();
  }
  console.log("✔ collections ensured");
  const anyAdmin = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  if (anyAdmin.length === 0) {
    const email = process.env.ADMIN_EMAIL, pw = process.env.ADMIN_PASSWORD;
    if (!email || !pw || pw.length < 12) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) to create the first admin");
    await db.insert(adminUsers).values({ email: email.toLowerCase(), name: process.env.ADMIN_NAME ?? "Admin", passwordHash: await hashPassword(pw), role: "OWNER" });
    console.log(`✔ admin created: ${email}`);
  }
  await db.insert(settings).values([
    { key: "site", value: { title: "Dev Parth", tagline: "Poetry, thoughts, and the things that remained unsaid.", commentsEnabled: false } },
    { key: "book", value: { title: "Inkscapes", subtitle: "Poetry by Dev Parth", dedication: "" } },
  ]).onConflictDoNothing();
  await pgClient.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
