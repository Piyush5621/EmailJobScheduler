import type { RequestHandler } from "express";
import type { AppUser } from "../models/user.model.js";
import {
  listRecipients,
  saveRecipient,
} from "../services/recipient.service.js";

export const createRecipientController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const user = req.user as AppUser;
    const { email, name } = req.body as {
      email?: string;
      name?: string | null;
    };

    if (typeof email !== "string" || !email.trim()) {
      res.status(400).json({
        status: "error",
        message: "Recipient email is required.",
      });
      return;
    }

    if (name !== undefined && name !== null && typeof name !== "string") {
      res.status(400).json({
        status: "error",
        message: "Recipient name must be a string.",
      });
      return;
    }

    const recipient = await saveRecipient(
      user.id,
      email,
      name ?? null
    );

    res.status(201).json({
      status: "success",
      data: { recipient },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecipientsController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const user = req.user as AppUser;
    const recipients = await listRecipients(user.id);

    res.status(200).json({
      status: "success",
      data: { recipients },
    });
  } catch (error) {
    next(error);
  }
};