import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// --- Better Auth tables -----------------------------------------------------
// Field names and types must match what Better Auth expects (see getAuthTables
// in @better-auth/core). A "user" here is a person who receives notifications.

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
};

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  ...timestamps,
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// --- App tables ---------------------------------------------------------------

// Cached copy of the shows on the Plex server, so pages don't hit Plex on every load.
export const shows = sqliteTable("shows", {
  ratingKey: text("rating_key").primaryKey(),
  title: text("title").notNull(),
  year: integer("year"),
  syncedAt: integer("synced_at", { mode: "timestamp" }).notNull(),
});

export const follows = sqliteTable(
  "follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    showRatingKey: text("show_rating_key")
      .notNull()
      .references(() => shows.ratingKey, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.showRatingKey] })],
);

// Every episode the check job has detected, keyed by episodeKey() from lib/new-episodes.
export const seenEpisodes = sqliteTable("seen_episodes", {
  key: text("key").primaryKey(),
  ratingKey: text("rating_key").notNull(),
  showRatingKey: text("show_rating_key").notNull(),
  showTitle: text("show_title").notNull(),
  season: integer("season"),
  episode: integer("episode"),
  title: text("title").notNull(),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull(),
  seenAt: integer("seen_at", { mode: "timestamp" }).notNull(),
});

// Queue of "tell this person about this episode". sentAt stays null until the
// email goes out, so a failed send is retried on the next run instead of lost.
export const deliveries = sqliteTable(
  "deliveries",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    episodeKey: text("episode_key")
      .notNull()
      .references(() => seenEpisodes.key, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    sentAt: integer("sent_at", { mode: "timestamp" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.episodeKey] }), index("deliveries_unsent_idx").on(t.sentAt)],
);

export type User = typeof user.$inferSelect;
export type CachedShow = typeof shows.$inferSelect;
