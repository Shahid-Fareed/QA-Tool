# QA Tool

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

2. **Install necessary UI and feature libraries:**
   This project uses various libraries, including:
   - **UI & Styling:** `lucide-react`, `framer-motion`, `clsx`, `tailwind-merge`
   - **AI Integration:** `ai` (Vercel AI SDK), `@ai-sdk/google`, `@ai-sdk/groq`
   - **Data Visualization & Markdown:** `recharts`, `react-markdown`, `react-syntax-highlighter`
   - **Backend & Database:** `express`, `mongoose`, `multer`
   - **File Processing:** `pdf-parse`, `mammoth`, `docx`, `jspdf`

   To install these libraries manually, you can choose to install them all at once or separately by category. **Run these commands in the root `qa-tool` directory:**

   **Option 1: Install all in one command**

   ```bash
   npm install lucide-react framer-motion clsx tailwind-merge ai @ai-sdk/google @ai-sdk/groq recharts react-markdown react-syntax-highlighter express mongoose multer pdf-parse mammoth docx jspdf
   ```

   **Option 2: Install separately by category**

   ```bash
   # UI & Styling
   npm install lucide-react framer-motion clsx tailwind-merge

   # AI Integration
   npm install ai @ai-sdk/google @ai-sdk/groq

   # Data Visualization & Markdown
   npm install recharts react-markdown react-syntax-highlighter

   # Backend & Database
   npm install express mongoose multer

   # File Processing
   npm install pdf-parse mammoth docx jspdf
   ```

3. **Install all remaining dependencies:**
   Make sure to also run the standard install command **in the root `qa-tool` directory** to install any root workspace dependencies (like `concurrently`) and complete the setup.

   ```bash
   npm install
   ```

4. **Run the development server:**
   This will start both the frontend and backend simultaneously using `concurrently`. **Run this in the root `qa-tool` directory:**
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
