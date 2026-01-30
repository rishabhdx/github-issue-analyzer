import type { Request, Response, NextFunction } from "express";
import { prisma } from "../services/prisma";

const repoNameFormatMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { repo } = req.body;
  const repoNamePattern = /^[\w-]+\/[\w.-]+$/;

  if (!repoNamePattern.test(repo)) {
    return res.status(400).json({
      error: "Invalid repository name format. Use 'owner/repo' format."
    });
  }

  next();
};

const apiKeyAuthenticationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["authorization"];

  console.log(`Authenticating API key: ${apiKey}`);

  if (!apiKey) {
    return res.status(401).json({
      error: "API key missing in Authorization header"
    });
  }

  const key = apiKey.split(" ")[1];

  try {
    const doesAPIKey = await prisma.aPIKeys.findUnique({
      where: {
        key: key
      }
    });

    if (!doesAPIKey) {
      return res.status(401).json({
        error: "Invalid API key"
      });
    }

    next();
  } catch (error) {
    console.error("Error during API key authentication:", error);

    return res.status(500).json({
      error: "Internal server error",
      details: "Could not authenticate API key"
    });
  }
};

export { repoNameFormatMiddleware, apiKeyAuthenticationMiddleware };
