import type { Request, Response } from "express";
import { Worker } from "worker_threads";
import path from "path";

import { jobQueue } from "../services/job-queue";

export const scanController = async (req: Request, res: Response) => {
  const { repo } = req.body;
  console.log(`API KEY received: ${req.headers["authorization"]}`);

  const [owner, repoName] = repo.split("/");

  try {
    // Create a new job
    const jobId = jobQueue.createJob(repo, owner, repoName);
    console.log(`Created job ${jobId} for ${owner}/${repoName}`);

    // Spawn a worker thread to handle the scanning
    const workerPath = path.join(__dirname, "../workers/scan-repo-worker.js");
    const worker = new Worker(workerPath);

    // Send the job message to the worker
    worker.postMessage({
      jobId,
      repo,
      owner,
      repoName
    });
    // Clean up worker when it's done
    worker.on("error", error => {
      console.error(`Worker error for job ${jobId}:`, error);
      jobQueue.updateJobStatus(jobId, "failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      worker.terminate();
    });

    worker.on("exit", code => {
      if (code !== 0) {
        console.error(`Worker exited with code ${code} for job ${jobId}`);
        const job = jobQueue.getJob(jobId);
        if (job?.status === "in-progress") {
          jobQueue.updateJobStatus(jobId, "failed", {
            error: `Worker terminated unexpectedly with code ${code}`
          });
        }
      }
      worker.terminate();
    });

    // Return the job ID immediately
    res.status(202).json({
      job_id: jobId,
      repo: repo,
      message: "Repository scanning started in background",
      status_url: `${jobId}`
    });
  } catch (error: any) {
    console.error(`Error creating scan job for ${owner}/${repoName}:`, error);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to create scanning job"
    });
  }
};
