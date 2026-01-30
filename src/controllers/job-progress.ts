import type { Request, Response } from "express";
import { jobQueue } from "../services/job-queue";

export const jobProgressController = async (req: Request, res: Response) => {
  const { jobId } = req.params;

  try {
    const job = jobQueue.getJob(jobId);

    console.log(`Retrieved job progress for ${jobId}:`, job);

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
        details: `Job with ID ${jobId} does not exist`
      });
    }

    res.status(200).json({
      job_id: job.id,
      status: job.status,
      repo: job.repo,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
      result: job.result
    });
  } catch (error: any) {
    console.error(`Error retrieving job progress for ${jobId}:`, error);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to retrieve job progress"
    });
  }
};
