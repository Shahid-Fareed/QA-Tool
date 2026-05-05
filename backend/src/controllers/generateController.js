const { streamText, generateText } = require("ai");
const { extractTextFromBuffer } = require("../lib/parser");
const dbConnect = require("../db");
const Project = require("../models/Project");
const TestCase = require("../models/TestCase");
const {
  DISCOVERY_SYSTEM_PROMPT,
  getScriptGenerationPrompt,
} = require("../lib/prompts");
const {
  getNextGroqClient,
  safeParseJSON,
  processModuleExpansion,
  delay,
} = require("../services/aiService");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  LevelFormat,
} = require("docx");

exports.generateProject = async (req, res) => {
  try {
    const instructions = req.body.instructions?.trim() || "";
    let text = "";

    if (req.file) {
      text = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    }

    if (!text && !instructions) {
      return res
        .status(400)
        .json({ error: "No file or instructions provided" });
    }

    const groq = getNextGroqClient();

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Accel-Buffering", "no");

    let resolveFinish;
    const onFinishPromise = new Promise((resolve) => {
      resolveFinish = resolve;
    });

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: DISCOVERY_SYSTEM_PROMPT,
      prompt: `REQUIREMENTS:\n${text}\n\nUSER INSTRUCTIONS:\n${instructions}`,
      temperature: 0.2,
      maxOutputTokens: 8192,
      onFinish: async ({ text: discoveryOutput }) => {
        try {
          const discoveryData = safeParseJSON(discoveryOutput);
          if (
            !discoveryData ||
            !discoveryData.modules ||
            discoveryData.modules.length === 0 ||
            discoveryData.project.name === "Unknown Project"
          ) {
            res.write(
              '\n{"signal": "error", "message": "Insufficient data to generate a project."}\n',
            );
            return;
          }

          const { project, modules } = discoveryData;
          await dbConnect();
          const newProject = await Project.create({
            projectName: project.name,
            description: project.description,
            createdBy: req.session.id,
          });

          const projectId = newProject._id.toString();
          res.write(`\nSIGNAL:PROJECT_ID:${projectId}\n`);
          res.write(`\nSIGNAL:PROJECT_NAME:${project.name}\n`);

          const modulesToProcess = [...modules];
          let hasSentUseCases = false;
          let hasSentTestCases = false;
          let hasSentBugs = false;
          let nextAvailableModuleIndex = 1;

          while (modulesToProcess.length > 0) {
            const moduleName = modulesToProcess.shift();
            if (!moduleName) break;

            if (!hasSentUseCases) {
              res.write('\n{"signal": "useCases"}\n');
              hasSentUseCases = true;
            }

            const success = await processModuleExpansion({
              moduleName,
              moduleIndex: nextAvailableModuleIndex,
              projectId,
              projectName: project.name,
              sourceText: text,
              projectDesc: project.description,
            });

            if (success) {
              nextAvailableModuleIndex++;
              if (!hasSentTestCases) {
                res.write('\n{"signal": "testCases"}\n');
                hasSentTestCases = true;
              }
              if (!hasSentBugs) {
                res.write('\n{"signal": "bugReports"}\n');
                hasSentBugs = true;
              }
            }
            await delay(500);
          }
          console.log("[generate] Generation complete.");
        } catch (err) {
          console.error("[generate] onFinish Error:", err);
          res.write(`\n{"signal": "error", "message": "${err.message}"}\n`);
        } finally {
          resolveFinish();
        }
      },
    });

    const stream = result.toTextStreamResponse();
    const reader = stream.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        await onFinishPromise;
        res.end();
        return;
      }
      res.write(value);
      await pump();
    };
    await pump();
  } catch (error) {
    console.error("[generate] API Error:", error);
    let message = error.message || "Internal Server Error";
    if (!res.headersSent) {
      return res
        .status(error.status === 429 ? 429 : 500)
        .json({ error: message });
    } else {
      res.write(`\n{"signal": "error", "message": "${message}"}\n`);
      res.end();
    }
  }
};

exports.generateScript = async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const { framework = "Playwright", language = "TypeScript" } = req.body;

    const testCase = await TestCase.findById(testCaseId);
    if (!testCase)
      return res.status(404).json({ error: "Test case not found" });

    const groq = getNextGroqClient();
    const model = groq("llama-3.3-70b-versatile");

    const prompt = `TEST CASE DETAILS:
Title: ${testCase.title}
Description: ${testCase.description}
Preconditions: ${testCase.preconditions}
Steps: ${testCase.steps}
Expected Result: ${testCase.expectedResult}

Generate the ${framework} automation script in ${language}.`;

    const { text: script } = await generateText({
      model,
      system: getScriptGenerationPrompt(framework, language),
      prompt: prompt,
      temperature: 0.3,
    });

    res.json({ script: script.trim() });
  } catch (error) {
    console.error("[generate-script] API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

exports.saveScript = async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const { script, framework, language } = req.body;

    const testCase = await TestCase.findByIdAndUpdate(
      testCaseId,
      {
        automationScript: script,
        automationFramework: framework,
        automationLanguage: language,
      },
      { new: true },
    );

    if (!testCase)
      return res.status(404).json({ error: "Test case not found" });
    res.json({ message: "Script saved successfully", testCase });
  } catch (error) {
    console.error("[save-script] API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const instructions = req.body.instructions?.trim() || "";
    const reportType = req.body.reportType || "document";
    let text = "";
    if (req.file) {
      text = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    }

    if (!text && !instructions) {
      return res
        .status(400)
        .json({ error: "No file or instructions provided" });
    }

    const groq = getNextGroqClient();

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Accel-Buffering", "no");

    const docPrompt = `You are a Senior QA Architect and Security Analyst. Analyze the provided requirements, PRD, or documentation and generate a highly detailed, professional 'Comprehensive Document Audit Report' in Markdown. 

You MUST strictly follow this exact structure:
- NEVER say "1000+ pages analysed" unless the file is actually that large. 
- ALWAYS provide a realistic estimate of the scope size (e.g. "Full PRD" or "Modules").
- DO NOT include CSS <style> tags in your output.

# [Project Name] Comprehensive Requirements Audit

**Audit Scope & Coverage**
[Provide a detailed paragraph explaining what was analyzed and excluded].

| Category | Findings | Critical | High | Medium |
|---|---|---|---|---|
| Functional | ... | ... | ... | ... |
| Security | ... | ... | ... | ... |
| Performance | ... | ... | ... | ... |
| Localization | ... | ... | ... | ... |
| **Total** | ... | ... | ... | ... |

## 1. Functional Findings
### CRITICAL — [Theme]
**F1. [Issue Title]**
[Description of missing logic, broken workflows, or edge cases].
**Fix:** [Actionable fix recommendation]

*(Repeat for High, Medium. Do the same for 2. Security (S1), 3. Performance (P1), and 4. Localization (L1) based on the document).*

## 5. Master Audit Checklist
| # | Finding | Severity | Category | Status |
|---|---|---|---|---|
| F1 | [Title] | CRITICAL | Functional | Pending |
*(List all generated findings here)*

## WHAT THE DOCUMENT GETS RIGHT
[Provide a bulleted list of 3-4 positive aspects of the requirements or architecture].`;

    const codePrompt = `You are a Senior Security Analyst and QA Code Auditor. Analyze the provided source code or context and generate a highly detailed, professional 'Comprehensive Code Audit Report' in Markdown. 

You MUST strictly follow this exact structure:
- NEVER say "1000+ pages analysed" unless the file is actually that large. 
- ALWAYS provide a realistic estimate of the scope size (e.g. "Repository" or "Files").
- DO NOT include CSS <style> tags in your output.

# [Project Name] Comprehensive Code Audit

**Audit Scope & Coverage**
[Provide a detailed paragraph explaining what was analyzed and excluded].

| Category | Files | Findings | Critical | High | Medium |
|---|---|---|---|---|---|
| Security | ... | ... | ... | ... | ... |
| Localization | ... | ... | ... | ... | ... |
| Performance | ... | ... | ... | ... | ... |
| Code Quality | ... | ... | ... | ... | ... |
| **Total** | ... | ... | ... | ... | ... |

## 1. Security Findings
### CRITICAL — [Theme]
**S1. [Issue Title]**
[Description of issue, extracting exact details].
**Fix:** [Actionable fix recommendation]

*(Repeat for High, Medium. Do the same for 2. Localization (L1), 3. Performance (P1), and 4. Code Quality (Q1)).*

## 5. Master Audit Checklist
| # | Finding | Severity | Category | Status |
|---|---|---|---|---|
| S1 | [Title] | CRITICAL | Security | Pending |
*(List all generated findings here)*

## WHAT THE CODEBASE GETS RIGHT
[Provide a bulleted list of 3-4 positive architectural or security patterns observed].`;

    const models = [
      "llama-3.3-70b-versatile",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ];

    let result;
    for (const modelId of models) {
      try {
        const basePrompt = reportType === "code" ? codePrompt : docPrompt;
        const systemPrompt = `${basePrompt}\n\nCRITICAL: DO NOT include any internal CSS, font-sizes, or styling rules in your output. Ignore the 'downloadDocx' styling logic entirely.`;
        result = streamText({
          model: groq(modelId),
          system: systemPrompt,
          prompt: `FILES/REQUIREMENTS:\n${text}\n\nUSER INSTRUCTIONS:\n${instructions}`,
          temperature: 0.3,
          maxOutputTokens: 8192,
        });
        break;
      } catch (err) {
        console.warn(
          `[generateReport] Model ${modelId} failed, trying next...`,
        );
        continue;
      }
    }

    if (!result) {
      throw new Error("All available AI models are currently rate-limited.");
    }

    const textStream = result.toTextStreamResponse();
    const reader = textStream.body?.getReader();
    const decoder = new TextDecoder();
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch (readError) {
        console.error("[generateReport] Stream error:", readError);
        res.write(
          String(readError?.message).includes("429")
            ? "\n\nERROR_SIGNAL:RATE_LIMIT"
            : "\n\nERROR_SIGNAL:INTERNAL",
        );
      }
    }
    res.end();
  } catch (error) {
    console.error("[generateReport] Global Error:", error);
    if (!res.headersSent) {
      const isRateLimit = String(error?.message).includes("429");
      res.status(isRateLimit ? 429 : 500).json({
        error: isRateLimit ? "Rate limit reached." : "Internal Server Error",
      });
    } else {
      res.end();
    }
  }
};

// ─── Helpers for downloadDocx ────────────────────────────────────────────────

/**
 * Parse inline Markdown (**bold**) into an array of TextRun objects.
 */
function parseInline(text) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      runs.push(new TextRun({ text: boldMatch[1], bold: true }));
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs.length ? runs : [new TextRun({ text: "" })];
}

/**
 * Build a docx Table from an array of markdown table lines.
 * Content width: 12240 - 1800 - 1800 = 8640 DXA (US Letter, 1.25" margins).
 */
function buildTable(lines) {
  // Drop separator rows (e.g. |---|---|)
  const dataLines = lines.filter((l) => !l.match(/^\|[\s|:-]+\|$/));
  if (dataLines.length === 0) return null;

  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const borders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };

  const rows = dataLines.map((line, rowIndex) => {
    const isHeader = rowIndex === 0;
    const cells = line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map(
        (cell) =>
          new TableCell({
            borders,
            shading: isHeader
              ? { fill: "EAEAEA", type: ShadingType.CLEAR }
              : undefined,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: parseInline(cell.trim()),
              }),
            ],
          }),
      );
    return new TableRow({ children: cells });
  });

  const colCount = dataLines[0].replace(/^\||\|$/g, "").split("|").length;
  const tableWidth = 8640;
  const colWidth = Math.floor(tableWidth / colCount);
  const colWidths = Array(colCount).fill(colWidth);
  colWidths[colCount - 1] = tableWidth - colWidth * (colCount - 1);

  return new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows,
  });
}

/**
 * Convert a Markdown string into an array of docx content blocks.
 * Supports: # headings (1–4), **bold**, tables, bullet lists, blank lines,
 * and plain paragraphs.
 */
function markdownToDocxChildren(markdown) {
  const lines = markdown.split("\n");
  const children = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    const h4 = line.match(/^#### (.+)/);
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);

    if (h1) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: parseInline(h1[1]),
        }),
      );
      i++;
      continue;
    }
    if (h2) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: parseInline(h2[1]),
        }),
      );
      i++;
      continue;
    }
    if (h3) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: parseInline(h3[1]),
        }),
      );
      i++;
      continue;
    }
    if (h4) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_4,
          children: parseInline(h4[1]),
        }),
      );
      i++;
      continue;
    }

    // Markdown table — collect all consecutive | lines
    if (line.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = buildTable(tableLines);
      if (table) children.push(table);
      continue;
    }

    // Bullet list items
    if (line.match(/^[-*] /)) {
      children.push(
        new Paragraph({
          numbering: { reference: "qa-bullets", level: 0 },
          children: parseInline(line.replace(/^[-*] /, "")),
        }),
      );
      i++;
      continue;
    }

    // Blank line → empty paragraph
    if (line.trim() === "") {
      children.push(new Paragraph({ children: [] }));
      i++;
      continue;
    }

    // Normal paragraph
    children.push(new Paragraph({ children: parseInline(line) }));
    i++;
  }

  return children;
}

// ─── downloadDocx ────────────────────────────────────────────────────────────

exports.downloadDocx = async (req, res) => {
  try {
    const { markdown } = req.body;
    if (!markdown)
      return res.status(400).json({ error: "Markdown content is required" });

    const doc = new Document({
      // ── Typography — matched exactly from QA_Analysis_Report__1_.docx ───
      styles: {
        default: {
          document: {
            run: { font: "Times New Roman", size: 24 }, // 12pt body
          },
        },
        paragraphStyles: [
          // Heading 1 — 16pt bold, spacing before 480 (matches sz=32 in original)
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Times New Roman", size: 32, bold: true },
            paragraph: {
              spacing: { before: 480, after: 0, line: 240 },
              outlineLevel: 0,
            },
          },
          // Heading 2 — 14pt bold, spacing before 360 after 80 (matches sz=28)
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Times New Roman", size: 28, bold: true },
            paragraph: {
              spacing: { before: 360, after: 80, line: 240 },
              outlineLevel: 1,
            },
          },
          // Heading 3 — 13pt bold, spacing before 280 after 80 (matches sz=26)
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Times New Roman", size: 26, bold: true },
            paragraph: {
              spacing: { before: 280, after: 80, line: 240 },
              outlineLevel: 2,
            },
          },
          // Heading 4 — 12pt bold, spacing before 240 after 40 (matches sz=24)
          {
            id: "Heading4",
            name: "Heading 4",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Times New Roman", size: 24, bold: true },
            paragraph: {
              spacing: { before: 240, after: 40, line: 240 },
              outlineLevel: 3,
            },
          },
        ],
      },

      // ── Bullet list ──────────────────────────────────────────────────────
      numbering: {
        config: [
          {
            reference: "qa-bullets",
            levels: [
              {
                level: 0,
                format: LevelFormat.BULLET,
                text: "\u2022",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
              },
            ],
          },
        ],
      },

      sections: [
        {
          properties: {
            page: {
              // US Letter — matched from original pgSz w=12240 h=15840
              size: { width: 12240, height: 15840 },
              // Margins — matched from original pgMar top/bottom=1440, left/right=1800
              margin: { top: 1440, bottom: 1440, left: 1800, right: 1800 },
            },
          },
          children: markdownToDocxChildren(markdown),
        },
      ],
    });

    const fileBuffer = await Packer.toBuffer(doc);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=QA_Analysis_Report.docx",
    );
    res.send(fileBuffer);
  } catch (error) {
    console.error("[downloadDocx] API Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
