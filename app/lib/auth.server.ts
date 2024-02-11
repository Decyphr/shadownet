import bcrypt from "bcryptjs";
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import invariant from "tiny-invariant";

import { authSessionStorage } from "~/lib/session.server";

import type { Password, User } from "@prisma/client";
import { prisma } from "~/lib/db.server";

export const authenticator = new Authenticator<User>(authSessionStorage);

authenticator.use(
  new FormStrategy(async ({ form, context }) => {
    // You can get the form data from the context
    const email = form.get("email");
    const password = form.get("password");

    console.log(context);

    // You can validate the inputs however you want
    invariant(typeof email === "string", "username must be a string");
    invariant(email.length > 0, "username must not be empty");

    invariant(typeof password === "string", "password must be a string");
    invariant(password.length > 0, "password must not be empty");

    // And if you have a password you should hash it
    const hashedPassword = await getPasswordHash(password);

    // And finally, you can find, or create, the user
    let user = await prisma.user.findUnique({
      where: { email: email as string },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: "test.user",
          name: "Test User",
          email: email as string,
          password: {
            create: {
              hash: hashedPassword,
            },
          },
        },
      });
    }

    // And return the user as the Authenticator expects it
    return user;
  })
);

/**
 ** Auth Utilities
 *
 */

// TODO: Update to respect remember me value - 1 day or 30 days
export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30; // 30 days
export const getSessionExpirationDate = () =>
  new Date(Date.now() + SESSION_EXPIRATION_TIME);

export const sessionKey = "sessionId";

export async function login({
  username,
  password,
}: {
  username: User["username"];
  password: string;
}) {
  const user = await verifyUserPassword({ username }, password);
  if (!user) return null;

  const session = await prisma.session.create({
    select: { id: true, expirationDate: true, userId: true },
    data: {
      expirationDate: getSessionExpirationDate(),
      userId: user.id,
    },
  });
  return session;
}

export async function getPasswordHash(password: string) {
  const hash = await bcrypt.hash(password, 10);
  return hash;
}

export async function verifyUserPassword(
  where: Pick<User, "username"> | Pick<User, "id">,
  password: Password["hash"]
) {
  const userWithPassword = await prisma.user.findUnique({
    where,
    select: { id: true, password: { select: { hash: true } } },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );

  if (!isValid) {
    return null;
  }

  return { id: userWithPassword.id };
}
