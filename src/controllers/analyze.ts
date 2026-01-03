import type { Request, Response } from "express";
import {
  PrismaClientUnknownRequestError,
  PrismaClientKnownRequestError
} from "@prisma/client/runtime/client";

import { prisma } from "../services/prisma";
import { openai } from "../services/openai";
import { generateUserPrompt, generateSystemPrompt } from "../utils/prompt";

export const analyzeController = async (req: Request, res: Response) => {
  const { repo, prompt } = req.body;

  // Input validation for prompt
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "Prompt is required and must be a string",
      details: "Please provide a valid prompt for the analysis"
    });
  }

  if (prompt.trim().length === 0) {
    return res.status(400).json({
      error: "Prompt cannot be empty",
      details: "Please provide a meaningful prompt for the analysis"
    });
  }

  if (prompt.length > 2000) {
    return res.status(400).json({
      error: "Prompt too long",
      details: "Please keep your prompt under 2000 characters"
    });
  }

  console.log(`Received analyze request for repository: ${repo}`);

  const [owner, repoName] = repo.split("/");

  try {
    console.log(`Looking up repository ${owner}/${repoName} in database`);

    const repository = await prisma.repository.findUnique({
      where: {
        name: repoName,
        owner: owner
      },
      include: {
        issues: true
      }
    });

    if (!repository) {
      console.log(`Repository ${owner}/${repoName} not found in database`);

      return res.status(404).json({
        error: "Repository not found",
        details: `Repository ${owner}/${repoName} has not been scanned yet. Please scan it first using the /scan endpoint.`
      });
    }

    if (repository.issues.length === 0) {
      console.log(`Repository ${owner}/${repoName} has no issues`);

      return res.status(200).json({
        analysis: "This repository has no open issues to analyze.",
        issues_count: 0
      });
    }

    console.log(`Generating prompts for ${repository.issues.length} issues`);

    const systemPrompt = generateSystemPrompt({ owner, repoName });
    const userPrompt = generateUserPrompt({
      owner,
      repoName,
      issues: repository.issues,
      prompt
    });

    console.log(`Calling OpenAI API for analysis of ${owner}/${repoName}`);

    const response = await openai.responses.create({
      model: "gpt-5",
      instructions: systemPrompt,
      input: userPrompt
    });

    console.log(`Analysis completed successfully for ${owner}/${repoName}`);

    res.status(200).json({ analysis: response.output_text });
  } catch (error: any) {
    console.error(`Error during analysis for ${owner}/${repoName}:`, error);

    // OpenAI API errors
    if (error.status) {
      console.error("OpenAI API error:", error.status, error.message);

      if (error.status === 401) {
        return res.status(500).json({
          error: "AI service authentication error",
          details: "There's an issue with the AI service configuration"
        });
      }

      if (error.status === 429) {
        return res.status(429).json({
          error: "AI service rate limit exceeded",
          details:
            "Too many requests to the AI service. Please try again later."
        });
      }

      if (error.status === 400) {
        return res.status(400).json({
          error: "Invalid request to AI service",
          details: "The prompt or request format is invalid"
        });
      }

      if (error.status >= 500) {
        return res.status(503).json({
          error: "AI service unavailable",
          details:
            "The AI service is temporarily unavailable. Please try again later."
        });
      }

      return res.status(500).json({
        error: "AI service error",
        details: error.message || "An error occurred with the AI service",
        status: error.status
      });
    }

    // Database/Prisma errors
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("Prisma known error:", error.code, error.message);
      return res.status(500).json({
        error: "Database error",
        details: "An error occurred while accessing the database",
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
        details:
          "Unable to connect to external services. Please try again later."
      });
    }

    // Prompt generation errors
    if (error.message && error.message.includes("prompt")) {
      return res.status(400).json({
        error: "Prompt processing error",
        details:
          "There was an issue processing your prompt or the repository data"
      });
    }

    // Generic fallback error
    console.error("Unexpected error:", error);
    res.status(500).json({
      error: "Internal server error",
      details:
        "An unexpected error occurred during analysis. Please try again later."
    });
  }
};
