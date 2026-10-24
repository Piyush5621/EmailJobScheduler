
import type { RequestHandler } from "express";
import type { AppUser } from "../models/user.model.js";
import {
  listCampaigns,
  saveCampaign,
} from "../services/campaign.service.js";

export const createCampaignController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const user = req.user as AppUser;

    const {
      subject,
      body,
      startAt,
      delaySeconds,
      hourlyLimit,
      recipientIds,
    } = req.body as {
      subject?: string;
      body?: string;
      startAt?: string;
      delaySeconds?: number;
      hourlyLimit?: number | null;
      recipientIds?: number[];
    };

    if (typeof subject !== "string" || !subject.trim()) {
      res.status(400).json({
        status: "error",
        message: "Campaign subject is required.",
      });
      return;
    }

    if (typeof body !== "string" || !body.trim()) {
      res.status(400).json({
        status: "error",
        message: "Campaign body is required.",
      });
      return;
    }

    if (typeof startAt !== "string" || !startAt.trim()) {
      res.status(400).json({
        status: "error",
        message: "Campaign start time is required.",
      });
      return;
    }

    if (
      delaySeconds !== undefined &&
      (typeof delaySeconds !== "number" ||
        !Number.isInteger(delaySeconds) ||
        delaySeconds < 0)
    ) {
      res.status(400).json({
        status: "error",
        message: "Delay must be a non-negative whole number.",
      });
      return;
    }

    if (
      hourlyLimit !== undefined &&
      hourlyLimit !== null &&
      (typeof hourlyLimit !== "number" ||
        !Number.isInteger(hourlyLimit) ||
        hourlyLimit <= 0)
    ) {
      res.status(400).json({
        status: "error",
        message: "Hourly limit must be a positive whole number.",
      });
      return;
    }

    if (
      !Array.isArray(recipientIds) ||
      recipientIds.length === 0 ||
      recipientIds.some((id) => !Number.isInteger(id) || id <= 0)
    ) {
      res.status(400).json({
        status: "error",
        message: "Select at least one valid recipient.",
      });
      return;
    }

    const parsedStartAt = new Date(startAt);

    if (Number.isNaN(parsedStartAt.getTime())) {
      res.status(400).json({
        status: "error",
        message: "Please provide a valid campaign start time.",
      });
      return;
    }

    const campaign = await saveCampaign(
      user.id,
      subject,
      body,
      parsedStartAt,
      delaySeconds ?? 0,
      hourlyLimit ?? null,
      recipientIds
    );

    res.status(201).json({
      status: "success",
      data: { campaign },
    });
  } catch (error) {
    next(error);
  }
};

export const getCampaignsController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const user = req.user as AppUser;
    const campaigns = await listCampaigns(user.id);

    res.status(200).json({
      status: "success",
      data: { campaigns },
    });
  } catch (error) {
    next(error);
  }
};
