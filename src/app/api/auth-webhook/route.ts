import { clerkClient } from "@clerk/nextjs";
import { User, WebhookEvent } from "@clerk/nextjs/dist/types/server";
import { eq } from "drizzle-orm";
import type { IncomingHttpHeaders } from "http";
import { NextRequest, NextResponse } from "next/server";
import { Webhook, WebhookRequiredHeaders } from "svix";
import { db } from "~/lib/db";
import { AuditLogTable, NewUser, UsersTable } from "~/lib/db/schema";

type UnwantedKeys =
  | "emailAddresses"
  | "firstName"
  | "lastName"
  | "primaryEmailAddressId"
  | "primaryPhoneNumberId"
  | "phoneNumbers";

interface UserInterface extends Omit<User, UnwantedKeys> {
  email_addresses: {
    email_address: string;
    id: string;
    verification: {
      strategy: string;
    };
  }[];
  primary_email_address_id: string;
  first_name: string;
  last_name: string;
  primary_phone_number_id: string;
  phone_numbers: {
    phone_number: string;
    id: string;
  }[];
  image_url: string;

  // Session event
  user_id: string;
}

const webhookSecret: string = process.env.WEBHOOK_SECRET || "";

type NextRequestWithSvixHeaders = NextRequest & {
  headers: IncomingHttpHeaders & WebhookRequiredHeaders;
};

type Event = {
  data: UserInterface;
  object: "event";
  type: EventType;
};

type EventType =
  | "user.created"
  | "user.updated"
  | "session.created"
  | "session.ended"
  | "*";

export async function POST(req: NextRequestWithSvixHeaders) {
  const payload = (await req.json()) as WebhookEvent;
  const headerPayload = req.headers;
  const svixId = headerPayload.get("svix-id");
  const svixIdTimeStamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  console.log({ payload });

  if (!payload.type) {
    console.log("no payload");
    return NextResponse.json({ message: "No payload" }, { status: 400 });
  }
  if (!svixId || !svixIdTimeStamp || !svixSignature) {
    console.log("svixId", svixId);
    console.log("svixIdTimeStamp", svixIdTimeStamp);
    console.log("svixSignature", svixSignature);

    return NextResponse.json({ message: "No svix headers" }, { status: 400 });
  }

  const svixHeaders = {
    "svix-id": svixId,
    "svix-timestamp": svixIdTimeStamp,
    "svix-signature": svixSignature,
  };

  const wh = new Webhook(webhookSecret);
  let evt: Event | null = null;
  try {
    evt = wh.verify(JSON.stringify(payload), svixHeaders) as Event;

    console.log("Successfully Verified");
  } catch (_) {
    console.log("Failed to verify");
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  // Handle the webhook
  const eventType: EventType = evt.type;

  const userId = evt.data.user_id;

  console.log("hey im event: ", evt.data);

  if (eventType === "session.created") {
    console.log("signed in");

    await db.transaction(async (tx) => {
      await tx
        .update(UsersTable)
        .set({
          lastSignedInAt: new Date(),
        })
        .where(eq(UsersTable.id, parseInt(userId)));
      await tx.insert(AuditLogTable).values({
        userId: parseInt(userId),
        action: "SESSION_CREATED",
      });
    });
  }

  if (eventType === "session.ended") {
    console.log("signed out");

    await db.transaction(async (tx) => {
      await tx
        .update(UsersTable)
        .set({
          lastSignedOutAt: new Date(),
        })
        .where(eq(UsersTable.id, parseInt(userId)));
      await tx.insert(AuditLogTable).values({
        userId: parseInt(userId),
        action: "SESSION_ENDED",
      });
    });
  }

  if (eventType === "user.created") {
    console.log("signed up");

    const {
      email_addresses,
      primary_email_address_id,
      first_name,
      last_name,
      image_url,
      id,
    } = evt.data;

    const emailObject = email_addresses?.find((email) => {
      return email.id === primary_email_address_id;
    });
    if (!emailObject) {
      console.log("emailObject: ", emailObject);
      return NextResponse.json({ message: "No email object" }, { status: 400 });
    }

    await clerkClient.users.updateUserMetadata(id, {
      publicMetadata: {
        role: "MEMBER",
        plan: "FREE",
      },
    });

    const newUser = {
      id: parseInt(id),
      email: emailObject.email_address,
      image: image_url,
      firstName: first_name,
      lastName: last_name,
      verificationType: emailObject.verification.strategy,
      role: "MEMBER",
      plan: "FREE",
    } satisfies NewUser;

    await db.transaction(async (tx) => {
      await tx.insert(UsersTable).values(newUser);
      await tx.insert(AuditLogTable).values({
        userId: parseInt(userId),
        action: "USER_CREATED",
      });
    });

    console.log(`User ${id} was ${eventType}`);
  }

  if (eventType === "user.updated") {
    console.log("updated user");

    const {
      email_addresses,
      primary_email_address_id,
      first_name,
      last_name,
      image_url,
      id,
    } = evt.data;

    const emailObject = email_addresses?.find((email) => {
      return email.id === primary_email_address_id;
    });

    await db.transaction(async (tx) => {
      await tx
        .update(UsersTable)
        .set({
          email: emailObject?.email_address,
          firstName: first_name,
          lastName: last_name,
          image: image_url,
        })
        .where(eq(UsersTable.id, parseInt(id)));
      await tx.insert(AuditLogTable).values({
        userId: parseInt(userId),
        action: "USER_UPDATED",
      });
    });
  }
}
