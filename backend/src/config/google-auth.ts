import "dotenv/config";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import {
  findOrCreateUser,
  getUserById,
} from "../services/user.service.js";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = process.env.GOOGLE_CALLBACK_URL;

if (!clientId || !clientSecret || !callbackURL) {
  throw new Error("Google OAuth environment variables are missing.");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: clientId,
      clientSecret,
      callbackURL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("Google account did not provide an email."));
        }

        const user = await findOrCreateUser({
          googleId: profile.id,
          name: profile.displayName,
          email,
          avatar: profile.photos?.[0]?.value,
        });

        done(null, user);
      } catch (error) {
        done(error instanceof Error ? error : new Error("Google login failed."));
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, (user as { id: number }).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await getUserById(id);

    if (!user) {
      return done(null, false);
    }

    done(null, user);
  } catch (error) {
    done(error instanceof Error ? error : new Error("Could not load user."));
  }
});

export default passport;
