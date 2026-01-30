import { EventEmitter } from "events";

export type JobStatus = "pending" | "in-progress" | "completed" | "failed";

export interface Job {
  id: string;
  status: JobStatus;
  repo: string;
  owner: string;
  repoName: string;
  createdAt: Date;
  updatedAt: Date;
  result?: {
    issues_fetched?: number;
    cached_successfully?: boolean;
    error?: string;
  };
}

class JobQueueService extends EventEmitter {
  private jobs: Map<string, Job> = new Map();

  createJob(repo: string, owner: string, repoName: string): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job: Job = {
      id: jobId,
      status: "pending",
      repo,
      owner,
      repoName,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.jobs.set(jobId, job);
    return jobId;
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  updateJobStatus(
    jobId: string,
    status: JobStatus,
    result?: Job["result"]
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.updatedAt = new Date();
      if (result) {
        job.result = result;
      }
      this.emit("job-updated", job);
    }
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }
}

export const jobQueue = new JobQueueService();
