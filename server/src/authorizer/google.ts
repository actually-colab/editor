import { OAuth2Client, LoginTicket } from 'google-auth-library';
import createHttpError from 'http-errors';

if (
  !process.env.IS_OFFLINE &&
  (process.env.GOOGLE_AUTH_WEB_CLIENT_ID == null ||
    process.env.GOOGLE_AUTH_WEB_CLIENT_SECRET == null)
) {
  throw new Error('Did not define Google Auth Client ID/Secret');
}

const client = new OAuth2Client(
  process.env.GOOGLE_AUTH_WEB_CLIENT_ID,
  process.env.GOOGLE_AUTH_WEB_CLIENT_SECRET
);

const audience = [
  process.env.GOOGLE_AUTH_WEB_CLIENT_ID ?? '',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

const isIllinoisEmail = (email: string): boolean => {
  const parts = email.split('@');
  return (
    email === 'btincher99@gmail.com' ||
    email === 'jefftaylorchang@gmail.com' ||
    email === 'yiyinnyc@gmail.com' ||
    (parts.length === 2 && parts[1] === 'illinois.edu')
  );
};

export const validateGoogleIdToken = async (
  token: string
): Promise<{
  googleUID: string;
  email: string;
  name?: string;
  image_url?: string;
}> => {
  let ticket: LoginTicket | null = null;
  try {
    ticket = await client.verifyIdToken({
      idToken: token,
      audience,
    });
  } catch (err) {
    console.error(err);
  }

  const payload = ticket?.getPayload();
  if (payload == null || payload.email == null) {
    throw new createHttpError.BadRequest('Could not get user');
  }

  if (!payload.email_verified) {
    throw new createHttpError.Forbidden('Google account not verified');
  }

  if (!process.env.IS_OFFLINE && !isIllinoisEmail(payload.email)) {
    throw new createHttpError.Forbidden('This service requires an @illinois.edu email');
  }

  return {
    googleUID: payload.sub,
    email: payload.email,
    name: payload.name,
    image_url: payload.picture,
  };
};
