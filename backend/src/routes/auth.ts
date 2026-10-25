import { Router } from "express";
import passport from "../config/google-auth.js";
import { requireAuth } from "../middleware/require-auth.js";
import type { AppUser } from "../models/user.model.js";

const router = Router();
const clientUrl = process.env.CLIENT_URL || "/";

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${clientUrl}?error=auth_failed`,
    session: true,
  }),
  (_req, res) => {
    res.redirect(clientUrl);
  }
);

router.post("/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }

    req.session.destroy((error) => {
      if (error) {
        return next(error);
      }

      res.clearCookie("connect.sid");
      res.status(200).json({
        status: "success",
        message: "Logged out successfully",
      });
    });
  });
});

router.get("/me", requireAuth, (req, res) => {
  const user = req.user as AppUser;

  res.status(200).json({
    status: "success",
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    },
  });
});

export default router;
