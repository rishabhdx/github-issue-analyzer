import type { Request, Response } from "express";
import crypto from "crypto";

import { prisma } from "../services/prisma";

export const generateAPIkey = async (req: Request, res: Response) => {
  try {
    const newKey = await prisma.aPIKeys.create({
      data: {
        key: crypto.randomBytes(32).toString("hex")
      }
    });

    return res.status(201).json({ apiKey: newKey.key });
  } catch (error) {
    console.error("Error generating API key:", error);

    return res.status(500).json({
      error: "Internal server error",
      details: "Could not generate API key"
    });
  }
};
