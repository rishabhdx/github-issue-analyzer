import express from "express";

import {
  apiKeyAuthenticationMiddleware,
  repoNameFormatMiddleware
} from "../middlewares/repo-name-format";
import { analyzeController } from "../controllers/analyze";

const analyzeRouter = express.Router();

analyzeRouter.post(
  "/analyze",
  repoNameFormatMiddleware,
  apiKeyAuthenticationMiddleware,
  analyzeController
);

export { analyzeRouter };
