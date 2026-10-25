import type { RequestHandler } from "express";
import type { AppUser } from "../models/user.model.js";
import { searchEmails, reindexAllEmails } from "../services/elasticsearch.service.js";

export const searchEmailsController: RequestHandler = async (req, res, next) => {
    try {
        const user = req.user as AppUser;
        const { q, status, from, size } = req.query as {
            q?: string;
            status?: string;
            from?: string;
            size?: string;
        };

        const result = await searchEmails(user.id, {
            query: q,
            status,
            from: from ? parseInt(from, 10) : 0,
            size: size ? parseInt(size, 10) : 20,
        });

        res.status(200).json({
            status: "success",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const reindexEmailsController: RequestHandler = async (req, res, next) => {
    try {
        const user = req.user as AppUser;
        const count = await reindexAllEmails(user.id);

        res.status(200).json({
            status: "success",
            message: `Successfully reindexed ${count} email(s) into Elasticsearch.`,
            data: { reindexedCount: count },
        });
    } catch (error) {
        next(error);
    }
};
