import { Prisma } from "../../generated/prisma/client";

export const generateSystemPrompt = ({
  owner,
  repoName
}: {
  owner: string;
  repoName: string;
}) => {
  return `You are an expert software engineer specializing in analyzing GitHub issues for the repository ${owner}/${repoName}. Your task is to provide insightful analysis and actionable recommendations based on the issues presented to you. Focus on identifying common themes, potential bugs, feature requests, and areas for improvement within the codebase. Your responses should be clear, concise, and tailored to help developers understand and address the issues effectively.`;
};

export const generateUserPrompt = ({
  owner,
  repoName,
  issues,
  prompt
}: {
  owner: string;
  repoName: string;
  issues: Prisma.IssueCreateManyRepositoryInput[];
  prompt: string;
}) => {
  const userPrompt = `
    Repository: ${owner}/${repoName}
    Total Issues: ${issues.length}

    Issues:
    ${issues
      .map(
        issue => `
          ID: ${issue.githubId}
          Title: ${issue.title}
          Created: ${issue.issueCreatedAt}
          Body: ${issue.body?.substring(0, 500)}...
          URL: ${issue.url}
        `
      )
      .join("\n---\n")}

    User Request: ${prompt}
    `;

  return userPrompt;
};
