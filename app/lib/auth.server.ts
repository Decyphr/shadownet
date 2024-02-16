import { redirect } from "@remix-run/node";
import bcrypt from "bcryptjs";
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import invariant from "tiny-invariant";

import { safeRedirect } from "remix-utils/safe-redirect";
import { SESSION_KEY } from "~/lib/constants";
import { prisma } from "~/lib/db.server";
import { authSessionStorage } from "~/lib/session.server";
import { combineHeaders, combineResponseInits } from "~/lib/utils";

import type { Password, User } from "@prisma/client";
import { routes } from "~/lib/routing";

export const authenticator = new Authenticator<User>(authSessionStorage);

authenticator.use(
  new FormStrategy(async ({ form, context }) => {
    // You can get the form data from the context
    const email = context?.email ?? form.get("email");
    const password = context?.password ?? form.get("password");
    // const rememberMe = context?.rememberMe ?? form.get("rememberMe");

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

/**
 * Get User ID - Returns the user ID if the user is logged in, otherwise null
 *
 * @param request
 * @returns User['id'] | null
 */

export async function getUserId(request: Request) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get("cookie")
  );
  const sessionId = authSession.get(SESSION_KEY);
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    select: { user: { select: { id: true } } },
    where: { id: sessionId, expirationDate: { gt: new Date() } },
  });
  if (!session?.user) {
    throw redirect("/", {
      headers: {
        "set-cookie": await authSessionStorage.destroySession(authSession),
      },
    });
  }
  return session.user.id;
}

/**
 * Require User ID - Redirects to '/login' if user is not logged in
 *
 * @param request
 * @param redirectTo
 * @returns User['id']
 */

export async function requireUserId(
  request: Request,
  { redirectTo }: { redirectTo?: string | null } = {}
) {
  const userId = await getUserId(request);
  if (!userId) {
    const requestUrl = new URL(request.url);
    redirectTo =
      redirectTo === null
        ? null
        : redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`;
    const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null;
    const loginRedirect = [routes.auth.login, loginParams?.toString()]
      .filter(Boolean)
      .join("?");
    throw redirect(loginRedirect);
  }
  return userId;
}

/**
 * Require Anonymous - Redirects to '/' if user is logged in
 *
 * @param request
 */

export async function requireAnonymous(request: Request) {
  const userId = await getUserId(request);
  if (userId) {
    throw redirect("/");
  }
}

/**
 * Signup - Creates a new user and session for that user
 *
 * @param email
 * @param username
 * @param password
 * @param name
 * @returns Session
 */

export async function signup({
  email,
  username,
  password,
  name,
}: {
  email: User["email"];
  username: User["username"];
  name: User["name"];
  password: string;
}) {
  const hashedPassword = await getPasswordHash(password);

  const session = await prisma.session.create({
    data: {
      expirationDate: getSessionExpirationDate(),
      user: {
        create: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          name,
          password: {
            create: {
              hash: hashedPassword,
            },
          },
        },
      },
    },
    select: { id: true, expirationDate: true },
  });

  return session;
}

/**
 * Login - Creates a new session for the user
 *
 * @param email
 * @param password
 * @returns Session
 */

export async function login({
  email,
  password,
}: {
  email: User["email"];
  password: string;
}) {
  const user = await verifyUserPassword({ email }, password);
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

/**
 * Logout - Deletes the user's session
 *
 * @param request
 * @param redirectTo
 * @param responseInit
 */

export async function logout(
  {
    request,
    redirectTo = "/",
  }: {
    request: Request;
    redirectTo?: string;
  },
  responseInit?: ResponseInit
) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get("cookie")
  );
  const sessionId = authSession.get(SESSION_KEY);
  // if this fails, we still need to delete the session from the user's browser
  // and it doesn't do any harm staying in the db anyway.
  if (sessionId) {
    // the .catch is important because that's what triggers the query.
    // learn more about PrismaPromise: https://www.prisma.io/docs/orm/reference/prisma-client-reference#prismapromise-behavior
    void prisma.session
      .deleteMany({ where: { id: sessionId } })
      .catch(() => {});
  }
  throw redirect(safeRedirect(redirectTo), {
    ...responseInit,
    headers: combineHeaders(
      { "set-cookie": await authSessionStorage.destroySession(authSession) },
      responseInit?.headers
    ),
  });
}

/**
 * Reset User Password
 *
 */

export async function resetUserPassword({
  username,
  password,
}: {
  username: User["username"];
  password: string;
}) {
  const hashedPassword = await getPasswordHash(password);
  return prisma.user.update({
    where: { username },
    data: {
      password: {
        update: {
          hash: hashedPassword,
        },
      },
    },
  });
}

/**
 * Get Password Hash - Returns the hashed password
 *
 * @param password
 * @returns Password['hash']
 */

export async function getPasswordHash(password: string) {
  const hash = await bcrypt.hash(password, 10);
  return hash;
}

/**
 * Verify User Password - Returns the user ID if the password is correct, otherwise null
 *
 * @param where
 * @param password
 * @returns User['id'] | null
 */

export async function verifyUserPassword(
  where: Pick<User, "email"> | Pick<User, "username"> | Pick<User, "id">,
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

/**
 * Handle New Session - Creates a new session for the user and redirects to the specified URL
 *
 * @param request
 * @param session
 * @param redirectTo
 * @param remember
 * @param responseInit
 */

export async function handleNewSession(
  {
    request,
    session,
    redirectTo,
    remember,
  }: {
    request: Request;
    session: { userId: string; id: string; expirationDate: Date };
    redirectTo?: string;
    remember: boolean;
  },
  responseInit?: ResponseInit
) {
  // TODO: Add 2FA verification
  /* const verification = await prisma.verification.findUnique({
		select: { id: true },
		where: {
			target_type: { target: session.userId, type: twoFAVerificationType },
		},
	})
	const userHasTwoFactor = Boolean(verification)

	if (userHasTwoFactor) {
		const verifySession = await verifySessionStorage.getSession()
		verifySession.set(unverifiedSessionIdKey, session.id)
		verifySession.set(rememberKey, remember)
		const redirectUrl = getRedirectToUrl({
			request,
			type: twoFAVerificationType,
			target: session.userId,
			redirectTo,
		})
		return redirect(
			`${redirectUrl.pathname}?${redirectUrl.searchParams}`,
			combineResponseInits(
				{
					headers: {
						'set-cookie':
							await verifySessionStorage.commitSession(verifySession),
					},
				},
				responseInit,
			),
		)
	} else { 
    // ... Login user without 2FA ...
  } */

  // Login user without 2FA
  const authSession = await authSessionStorage.getSession(
    request.headers.get("cookie")
  );
  authSession.set(SESSION_KEY, session.id);

  return redirect(
    safeRedirect(redirectTo),
    combineResponseInits(
      {
        headers: {
          "set-cookie": await authSessionStorage.commitSession(authSession, {
            expires: remember ? session.expirationDate : undefined,
          }),
        },
      },
      responseInit
    )
  );
}
