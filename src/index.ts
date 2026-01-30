import express from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";

import { scanRouter } from "./routes/scan";
import { analyzeRouter } from "./routes/analyze";
import { keyRouter } from "./routes/key";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.send("Welcome to the GitHub Issue Analyzer!");
});

app.use(keyRouter);
app.use(scanRouter);
app.use(analyzeRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
