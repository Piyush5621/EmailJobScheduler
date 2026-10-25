import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
    searchEmailsController,
    reindexEmailsController,
} from "../controllers/email-search.controller.js";

export const emailSearchRouter = Router();

emailSearchRouter.get("/search", requireAuth, searchEmailsController);
emailSearchRouter.post("/reindex", requireAuth, reindexEmailsController);
