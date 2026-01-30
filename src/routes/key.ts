import express from "express";

import { generateAPIkey } from "../controllers/key";

const keyRouter = express.Router();

keyRouter.post("/key", generateAPIkey);

export { keyRouter };
