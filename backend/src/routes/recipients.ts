import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createRecipientController,
  getRecipientsController,
} from "../controllers/recipient.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", createRecipientController);
router.get("/", getRecipientsController);

export default router;