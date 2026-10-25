import express from "express";
import { errorHandler } from "./middleware/error-handler.js";
import { sessionMiddleware } from "./config/session.js";
import passport from "./config/google-auth.js";
import recipientsRouter from "./routes/recipients.js";
import campaignsRouter from "./routes/campaigns.js";
import authRouter from "./routes/auth.js";
import { slackRouter } from "./routes/slack.js";

const app = express();

app.use(express.json());
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome EmailJobScheduler API is running"
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "EmailJobScheduler API is running"
  });
});

app.use("/auth", authRouter);
app.use("/api/recipients", recipientsRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/slack", slackRouter);
app.use("/integrations/slack", slackRouter);

app.use(errorHandler);

export default app;
