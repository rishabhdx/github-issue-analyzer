import { parentPort } from "worker_threads";
import {
  PrismaClientUnknownRequestError,
  PrismaClientKnownRequestError
} from "@prisma/client/runtime/client";

import { octokit } from "../services/github";
import { prisma } from "../services/prisma";
import { jobQueue } from "../services/job-queue";

interface ScanJobMessage {
  jobId: string;
  repo: string;
  owner: string;
  repoName: string;
}

async function scanRepository(message: ScanJobMessage) {
  const { jobId, repo, owner, repoName } = message;

  try {
    jobQueue.updateJobStatus(jobId, "in-progress");

    // Check if repository already exists in our database
    const doesRepoAlreadyExist = await prisma.repository.findUnique({
      where: {
        name: repoName,
        owner: owner
      }
    });

    // console.log(
    //   `[Worker] Checking if ${owner}/${repoName} already exists in database`,
    //   doesRepoAlreadyExist
    // );

    if (doesRepoAlreadyExist) {
      jobQueue.updateJobStatus(jobId, "completed", {
        error: "Repository already cached",
        cached_successfully: false
      });
      return;
    }

    // Fetch repository info first to validate it exists
    try {
      await octokit.rest.repos.get({
        owner: owner,
        repo: repoName
      });
    } catch (repoError: any) {
      jobQueue.updateJobStatus(jobId, "failed", {
        error: repoError.message
      });
      return;
    }

    console.log(`[Worker] Starting to fetch issues for ${owner}/${repoName}`);

    const allIssues = [];
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
        // Skip pull requests - they're returned by the issues API but aren't "issues"
        if (issue.pull_request) {
          continue;
        }
        console.log(`[Worker] Fetched issue #${issue.number}: ${issue.title}`);
        allIssues.push(issue);
      }
    }

    if (allIssues.length === 0) {
      console.log(`[Worker] No open issues found for ${owner}/${repoName}`);
      jobQueue.updateJobStatus(jobId, "completed", {
        issues_fetched: 0,
        cached_successfully: false
      });
      return;
    }

    console.log(
      `[Worker] Fetched ${allIssues.length} issues, now saving to database`
    );

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
      `[Worker] Successfully cached ${savedRepo.issues.length} issues for ${owner}/${repoName}`
    );

    jobQueue.updateJobStatus(jobId, "completed", {
      issues_fetched: savedRepo.issues.length,
      cached_successfully: true
    });
  } catch (error: any) {
    console.error(
      `[Worker] Error in scan job for ${owner}/${repoName}:`,
      error
    );

    // GitHub API rate limit error
    if (
      error.status === 403 &&
      error.response?.headers?.["x-ratelimit-remaining"] === "0"
    ) {
      const resetTime = new Date(
        parseInt(error.response.headers["x-ratelimit-reset"]) * 1000
      );
      jobQueue.updateJobStatus(jobId, "failed", {
        error: `GitHub API rate limit exceeded. Reset at ${resetTime.toISOString()}`
      });
      return;
    }

    // GitHub API errors
    if (error.status) {
      jobQueue.updateJobStatus(jobId, "failed", {
        error:
          error.message || "An error occurred while fetching data from GitHub"
      });
      return;
    }

    // Database/Prisma errors
    if (
      error instanceof PrismaClientKnownRequestError ||
      error instanceof PrismaClientUnknownRequestError
    ) {
      console.error("Prisma error:", error.message);
      jobQueue.updateJobStatus(jobId, "failed", {
        error: "Database error: " + error.message
      });
      return;
    }

    // Network/connection errors
    if (
      error.code === "ENOTFOUND" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ETIMEDOUT"
    ) {
      jobQueue.updateJobStatus(jobId, "failed", {
        error: "Network error: Unable to connect to GitHub API"
      });
      return;
    }

    // Generic fallback error
    jobQueue.updateJobStatus(jobId, "failed", {
      error: error.message || "An unexpected error occurred"
    });
  }
}

parentPort?.on("message", (message: ScanJobMessage) => {
  console.log(
    `[Worker] Received job message for ${message.owner}/${message.repoName}`
  );
  scanRepository(message);
});
