import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.isAuthenticated()) {
    return next(new AppError("You must be logged in", 401));
  }

  next();
};
