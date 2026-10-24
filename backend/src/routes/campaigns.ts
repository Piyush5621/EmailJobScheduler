
import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createCampaignController,
  getCampaignsController,
} from "../controllers/campaign.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", createCampaignController);
router.get("/", getCampaignsController);

export default router;
