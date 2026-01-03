import express from "express";

import { repoNameFormatMiddleware } from "../middlewares/repo-name-format";
import { scanController } from "../controllers/scan";

const scanRouter = express.Router();

scanRouter.post("/scan", repoNameFormatMiddleware, scanController);

export { scanRouter };
