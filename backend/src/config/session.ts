
import session from "express-session";
import { RedisStore } from "connect-redis";
import { redisClient } from "./redis.js";

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET is missing from the environment.");
}

export const sessionMiddleware = session({
  store: new RedisStore({
    client: redisClient,
    prefix: "emailscheduler:session:",
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
});
