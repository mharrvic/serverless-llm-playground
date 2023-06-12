import { InferModel } from "drizzle-orm";
import {
  pgEnum,
  pgTableCreator,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const pgTable = pgTableCreator((name) => `llm_playground_${name}`);

export const userRoleEnum = pgEnum("role", ["MEMBER", "ADMIN"]);
export const userPlanEnum = pgEnum("plan", ["FREE", "PAID"]);

export const UsersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email").notNull(),
    image: text("image"),
    verificationType: text("verificationType").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    lastSignedInAt: timestamp("lastSignedInAt"),
    lastSignedOutAt: timestamp("lastSignedOutAt"),
    role: userRoleEnum("role").default("MEMBER"),
    plan: userPlanEnum("plan").default("FREE"),
  },
  (users) => {
    return {
      uniqueIdx: uniqueIndex("unique_idx").on(users.email),
    };
  }
);

export const AuditLogTable = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  action: text("action").notNull(),
});

export type User = InferModel<typeof UsersTable>;
export type NewUser = InferModel<typeof UsersTable, "insert">;
