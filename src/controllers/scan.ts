import type { Request, Response } from "express";
import {
  PrismaClientUnknownRequestError,
  PrismaClientKnownRequestError
} from "@prisma/client/runtime/client";

import { octokit } from "../services/github";
import { prisma } from "../services/prisma";

export const scanController = async (req: Request, res: Response) => {
  const { repo } = req.body;

  const [owner, repoName] = repo.split("/");

  const allIssues = [];

  try {
    // Check if repository already exists in our database
    const doesRepoAlreadyExist = await prisma.repository.findUnique({
      where: {
        name: repoName,
        owner: owner
      }
    });

    if (doesRepoAlreadyExist) {
      return res.status(409).json({
        error: "Repository already cached",
        details: `${owner}/${repoName} has already been scanned and cached`
      });
    }

    // Fetch repository info first to validate it exists
    try {
      await octokit.rest.repos.get({
        owner: owner,
        repo: repoName
      });
    } catch (repoError: any) {
      if (repoError.status === 404) {
        return res.status(404).json({
          error: "Repository not found",
          details: `The repository ${owner}/${repoName} does not exist or is not accessible`
        });
      }
      if (repoError.status === 403) {
        return res.status(403).json({
          error: "Access forbidden",
          details: "You don't have permission to access this repository"
        });
      }
      throw repoError; // Re-throw for other errors
    }

    console.log(`Starting to fetch issues for ${owner}/${repoName}`);

    const iterator = octokit.paginate.iterator(
      octokit.rest.issues.listForRepo,
      {
        owner: owner,
        repo: repoName,
        state: "open",
        per_page: 100
      }
    );

    // iterate through each response
    for await (const { data: issues } of iterator) {
      for (const issue of issues) {
        console.log("Fetched issue #%d: %s", issue.number, issue.title);
        allIssues.push(issue);
      }
    }

    if (allIssues.length === 0) {
      console.log(`No open issues found for ${owner}/${repoName}`);
      return res.status(200).json({
        repo: repo,
        message: `No open issues found for ${owner}/${repoName}`,
        issues_fetched: 0,
        cached_successfully: false
      });
    }

    console.log(`Fetched ${allIssues.length} issues, now saving to database`);

    // Save to database
    const savedRepo = await prisma.repository.create({
      data: {
        name: repoName,
        owner: owner,
        issues: {
          createMany: {
            data: allIssues.map(issue => ({
              githubId: issue.id,
              title: issue.title,
              body: issue.body || "",
              url: issue.html_url,
              issueCreatedAt: new Date(issue.created_at)
            }))
          }
        }
      },
      include: {
        issues: true
      }
    });

    console.log(
      `Successfully cached ${savedRepo.issues.length} issues for ${owner}/${repoName}`
    );

    res.status(200).json({
      repo: repo,
      issues_fetched: allIssues.length,
      cached_successfully: true
    });
  } catch (error: any) {
    console.error(`Error in scanController for ${owner}/${repoName}:`, error);

    // GitHub API rate limit error
    if (
      error.status === 403 &&
      error.response?.headers?.["x-ratelimit-remaining"] === "0"
    ) {
      const resetTime = new Date(
        parseInt(error.response.headers["x-ratelimit-reset"]) * 1000
      );
      return res.status(429).json({
        error: "GitHub API rate limit exceeded",
        details: `Rate limit will reset at ${resetTime.toISOString()}`,
        reset_time: resetTime.toISOString()
      });
    }

    // GitHub API errors
    if (error.status) {
      return res.status(error.status).json({
        error: "GitHub API error",
        details:
          error.message || "An error occurred while fetching data from GitHub",
        status: error.status
      });
    }

    // Database/Prisma errors
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("Prisma known error:", error.code, error.message);

      if (error.code === "P2002") {
        return res.status(409).json({
          error: "Database conflict",
          details: "A record with this data already exists"
        });
      }

      return res.status(400).json({
        error: "Database validation error",
        details: error.message,
        code: error.code
      });
    }

    if (error instanceof PrismaClientUnknownRequestError) {
      console.error("Prisma unknown error:", error.message);
      return res.status(500).json({
        error: "Database error",
        details: "An unexpected database error occurred"
      });
    }

    // Network/connection errors
    if (
      error.code === "ENOTFOUND" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ETIMEDOUT"
    ) {
      return res.status(503).json({
        error: "Network error",
        details: "Unable to connect to GitHub API. Please try again later."
      });
    }

    // Generic fallback error
    console.error("Unexpected error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: "An unexpected error occurred while scanning the repository"
    });
  }
};
