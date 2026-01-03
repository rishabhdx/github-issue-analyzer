import type { Request, Response, NextFunction } from "express";

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

export { repoNameFormatMiddleware };
