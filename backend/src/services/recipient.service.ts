import type { Recipient } from "../models/recipient.model.js";
import {
    createRecipient,
    getRecipientsByUserId,
} from "../repositories/recipient.repository.js";

export async function saveRecipient(
    userId: number,
    email: string,
    name: string | null = null
): Promise<Recipient> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name?.trim() || null;

    if (!normalizedEmail) {
        throw new Error("Recipient email is required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new Error("Please provide a valid email address.");
    }


    return createRecipient(userId, normalizedEmail, normalizedName);
}

export async function listRecipients(
    userId: number
): Promise<Recipient[]> {
    return getRecipientsByUserId(userId);
}