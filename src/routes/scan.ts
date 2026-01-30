import express from "express";

import {
  apiKeyAuthenticationMiddleware,
  repoNameFormatMiddleware
} from "../middlewares/repo-name-format";
import { scanController } from "../controllers/scan";
import { jobProgressController } from "../controllers/job-progress";

const scanRouter = express.Router();

scanRouter.post(
  "/scan",
  repoNameFormatMiddleware,
  apiKeyAuthenticationMiddleware,
  scanController
);

scanRouter.get("/job/:jobId", jobProgressController);

export { scanRouter };
