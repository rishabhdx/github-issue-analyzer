import express from "express";
import { octokit } from "../services/github";

const scanRouter = express.Router();

scanRouter.post<{ repo: string }>("/scan", async (req, res) => {
  const { repo } = req.body;

  console.log(`Received scan request for repository: ${repo}`);

  const issues = await octokit.rest.issues.listForRepo({
    owner: "google",
    repo: "mcp",
    state: "open",
    per_page: 100
  });

  console.log(`Fetched ${issues.data.length} issues from GitHub repository.`);
  // console.log(issues.data);

  res.status(200).json({ msg: "ok" });
});

export { scanRouter };
