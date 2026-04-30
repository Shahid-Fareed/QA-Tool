# QA Tool

## Project Structure

This repository is set up as an NPM Workspace containing two main packages:

- `frontend`: A Next.js application (React 19, Tailwind CSS, Vercel AI SDK).
- `backend`: An Express server (MongoDB/Mongoose, Groq AI integration).

## Prerequisites

Before starting, ensure you have installed:

- [Node.js](https://nodejs.org/) (which includes `npm`)

## Getting Started

Follow these steps to start the project locally:

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd qa-tool
   ```

2. **Install all dependencies:**
   Run the standard install command in the root `qa-tool` directory. This will automatically install dependencies for both the frontend and backend workspaces.

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - In the `frontend` directory, ensure your `.env.local` file is set up.
   - In the `backend` directory, ensure your `.env` file is set up.

4. **Run the development server:**
   This will start both the frontend and backend simultaneously using `concurrently`. Run this in the root `qa-tool` directory:

   ```bash
   npm run dev
   ```

### Running Frontend and Backend Separately

If you prefer to run the frontend and backend in separate terminal windows, you can do so by running the following commands from the root directory:

**Terminal 1 (Backend):**

```bash
npm run dev:backend
```

**Terminal 2 (Frontend):**

```bash
npm run dev:frontend
```

Alternatively, you can navigate into their respective directories to start them:

**Terminal 1 (Backend):**

```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**

```bash
cd frontend
npm run dev
```
