import express from "express";
import cors from "cors";
import helmet from "helmet";
import { scanRouter } from "./routes/scan";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(scanRouter);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port:${PORT}`);
});
