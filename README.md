# GitHub Issue Analyzer

A powerful Express.js application that scans GitHub repositories, caches their open issues, and provides AI-powered analysis using OpenAI's GPT model.

## Features

- **Repository Scanning**: Fetch and cache all open issues from any public GitHub repository
- **AI-Powered Analysis**: Get intelligent insights and analysis of repository issues using OpenAI
- **SQLite Database**: Persistent storage of repository and issue data using Prisma ORM
- **Rate Limiting Protection**: Handles GitHub API rate limits gracefully
- **Input Validation**: Robust validation for repository names and analysis prompts
- **Error Handling**: Comprehensive error handling for API, database, and network errors

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- GitHub Personal Access Token
- OpenAI API Key

## Installation

1. Clone the repository:

```sh
git clone https://github.com/rishabhdx/github-issue-analyzer.git
cd github-issue-analyzer
```

2. Install dependencies:

```sh
npm install
```

3. Set up environment variables:

```sh
cp .env.example .env
```

4. Configure your `.env` file with:

```
GITHUB_REST_TOKEN=your-github-token
DATABASE_URL="file:./issues.db"
OPENAI_API_KEY=your-openai-api-key
PORT=5000
```

5. Run database migrations:

```sh
npx prisma migrate dev
```

## Usage

### Development Mode

```sh
npm run dev
```

### Production Build

```sh
npm run build
npm start
```

The server will start on the port specified in your `.env` file (default: 5000).

## API Endpoints

### 1. Root

```http
GET /
```

Returns a welcome message to verify the server is running.

### 2. Scan Repository

```http
POST /scan
Content-Type: application/json

{
  "repo": "owner/repository-name"
}
```

Fetches and caches all open issues from the specified GitHub repository.

**Response (Success - 200):**

```json
{
  "repo": "owner/repository-name",
  "issues_fetched": 42,
  "cached_successfully": true
}
```

**Error Responses:**

- `400`: Invalid repository name format
- `404`: Repository not found
- `409`: Repository already cached
- `429`: GitHub API rate limit exceeded

### 3. Analyze Repository

```http
POST /analyze
Content-Type: application/json

{
  "repo": "owner/repository-name",
  "prompt": "What are the most common issues in this repository?"
}
```

Analyzes cached repository issues using AI based on your prompt.

**Response (Success - 200):**

```json
{
  "analysis": "Based on the issues in this repository...",
  "repository": "owner/repository-name",
  "issues_analyzed": 42,
  "prompt_used": "What are the most common issues in this repository?"
}
```

**Error Responses:**

- `400`: Invalid repository name or prompt
- `404`: Repository not found (needs to be scanned first)
- `429`: AI service rate limit exceeded
- `503`: AI service unavailable

## Project Structure

```
github-issue-analyzer/
├── src/
│   ├── index.ts              # Application entry point
│   ├── controllers/
│   │   ├── analyze.ts        # Analysis logic
│   │   └── scan.ts           # Repository scanning logic
│   ├── middlewares/
│   │   └── repo-name-format.ts  # Repository name validation
│   ├── routes/
│   │   ├── analyze.ts        # Analysis routes
│   │   └── scan.ts           # Scan routes
│   ├── services/
│   │   ├── github.ts         # GitHub API client
│   │   ├── openai.ts         # OpenAI client
│   │   └── prisma.ts         # Prisma database client
│   └── utils/
│       ├── chunking.ts       # Issue chunking utilities
│       └── prompt.ts         # AI prompt generation utilities
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── generated/
│   └── prisma/               # Generated Prisma client
├── .env                      # Environment variables (not in git)
├── .env.example              # Environment variables template
├── package.json              # Project dependencies
└── tsconfig.json             # TypeScript configuration
```

## Database Schema

The application uses SQLite with the following schema:

### Repository

- `id`: Unique identifier (CUID)
- `owner`: Repository owner username
- `name`: Repository name (unique)
- `issues`: Related Issue records

### Issue

- `id`: Unique identifier (CUID)
- `githubId`: GitHub issue ID (unique)
- `title`: Issue title
- `body`: Issue description
- `url`: GitHub issue URL
- `issueCreatedAt`: When the issue was created on GitHub
- `createdAt`: When the record was created in our database
- `updatedAt`: Last update timestamp
- `repositoryId`: Foreign key to Repository

## Technologies Used

- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **Prisma**: ORM for database management
- **SQLite**: Lightweight database
- **Octokit**: GitHub REST API client
- **OpenAI**: AI-powered analysis
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment variable management

## Services

- `octokit`: GitHub API client for fetching repository data
- `prisma`: Database client using Better SQLite3 adapter
- `openai`: OpenAI client for AI-powered analysis

## Middleware

- `repoNameFormatMiddleware`: Validates repository name format (owner/repo)

## Error Handling

The application includes comprehensive error handling for:

- GitHub API errors (rate limits, authentication, not found)
- OpenAI API errors (rate limits, authentication, service unavailable)
- Database errors (conflicts, validation, connection)
- Network errors (timeouts, connection refused)
- Input validation errors

## Development

To run the development server with hot reload:

```sh
npm run dev
```

To build the TypeScript code:

```sh
npm run build
```

## List of prompts I used while building this project

Below are the prompts I've used:

- I have been given an assignment, I want to go with Node.js, anaylze the requirements and build out the plan and tell me the approach. `<assignment_requirements_pasted>`
- after fetching all issues, how do I break it down into chunks and store them as vectors? does sqlite provide support for that? if not, how do I do that?
- how do I efficiently setup token management for gpt models? show me examples to chunkify or summarize input to feed it to the LLM
- I wish to use `RecursiveCharacterTextSplitter` from `@langchain/textsplitters` library, update the example to use this
- do better error handling in this scan controller
- perform the same enhancements on the analyze controller, and also refactor/remove the initial repo input validation since it is already present in the repoNameFormat middleware
- generate the readme file by scanning my entire project

## Frequently asked questions

- #### Why did I choose SQLite over in-memory or JSON file-based storage options?

  - In-memory storage option was not chosen because I wanted the data to be persisted and not to be cleared out whenever the server restarts.
  - JSON file-based storage option was not chosen because of the following reasons:
    - **File size**: As the size of the issues would grow, so would the size of the issues JSON file. It then would have to be loaded entirely in the memory to be queried over.
    - **Query performance**: SQLite maintains performance through indexes and when querying data over multiple tables using `JOIN`'s, it's much better than using multiple JSON files or multiple arrays and performing combined operations.

- #### How can the performance of the analyze step be improved?
  - I've raised an [issue](https://github.com/rishabhdx/github-issue-analyzer/issues/1) for the same and described can the performance can be improved.

## License

ISC

## Author

Rishabh Dixit

---

For more information or to report issues, please visit the [GitHub repository](https://github.com/rishabhdx/github-issue-analyzer).
