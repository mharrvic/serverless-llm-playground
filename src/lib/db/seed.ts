import { sql } from "@vercel/postgres";
import { db } from "./index";
import { NewUser, User, UsersTable } from "./schema";

import "dotenv/config";

const newUsers: NewUser[] = [
  {
    firstName: "Guillermo",
    lastName: "Rauch",
    role: "ADMIN",
    plan: "FREE",
    verificationType: "PASSWORD",
    email: "rauchg@vercel.com",
    image:
      "https://pbs.twimg.com/profile_images/1576257734810312704/ucxb4lHy_400x400.jpg",
  },
  {
    firstName: "Lee",
    lastName: "Robinson",
    role: "ADMIN",
    plan: "FREE",
    verificationType: "PASSWORD",
    email: "lee@vercel.com",
    image:
      "https://pbs.twimg.com/profile_images/1587647097670467584/adWRdqQ6_400x400.jpg",
  },
  {
    firstName: "Steven",
    lastName: "Tey",
    role: "ADMIN",
    plan: "FREE",
    verificationType: "PASSWORD",
    email: "stey@vercel.com",
    image:
      "https://pbs.twimg.com/profile_images/1506792347840888834/dS-r50Je_400x400.jpg",
  },
];

async function seed() {
  // Create table with raw SQL
  const createTable = await sql.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        image VARCHAR(255),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
  `);
  console.log(`Created "users" table`);

  const insertedUsers: User[] = await db
    .insert(UsersTable)
    .values(newUsers)
    .returning();
  console.log(`Seeded ${insertedUsers.length} users`);

  return {
    createTable,
    insertedUsers,
  };
}

seed().catch((err) => {
  console.error("❌ Seed failed");
  console.error(err);
  process.exit(1);
});
