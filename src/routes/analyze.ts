import express from "express";

import { repoNameFormatMiddleware } from "../middlewares/repo-name-format";
import { analyzeController } from "../controllers/analyze";

const analyzeRouter = express.Router();

analyzeRouter.post("/analyze", repoNameFormatMiddleware, analyzeController);

export { analyzeRouter };
