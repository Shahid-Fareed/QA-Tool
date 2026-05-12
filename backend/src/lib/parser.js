const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

/**
 * Extract text from a buffer based on MIME type and filename.
 * @param {Buffer} buffer
 * @param {string} fileType - MIME type
 * @param {string} [filename] - Original filename
 * @returns {Promise<string>}
 */
async function extractTextFromBuffer(buffer, fileType, filename = "") {
  try {
    const mime = (fileType || "").toLowerCase();
    const name = (filename || "").toLowerCase();
    const ext = name.split(".").pop();

    if (mime === "application/pdf" || ext === "pdf") {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === "application/msword" ||
      ext === "docx" ||
      ext === "doc"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // Known text / code extensions that should always be read as text
    const textExtensions = [
      "js", "jsx", "ts", "tsx", "py", "java", "cpp", "c", "h", "cs", "go",
      "rb", "php", "html", "css", "json", "md", "txt", "yaml", "yml", "xml",
      "ini", "conf", "sh", "bat", "env", "properties", "gradle", "sql"
    ];

    if (
      mime.startsWith("text/") ||
      mime === "application/javascript" ||
      mime === "application/x-javascript" ||
      mime === "application/typescript" ||
      mime === "application/x-typescript" ||
      mime === "application/json" ||
      textExtensions.includes(ext) ||
      mime === "application/octet-stream" ||
      mime === "video/mp2t" || // Windows .ts MIME quirk
      !mime // empty fallback
    ) {
      return buffer.toString("utf-8");
    }

    throw new Error(`Unsupported file type: ${fileType} (${filename})`);
  } catch (error) {
    console.error("[parser] Extraction Error:", error);
    throw error;
  }
}

module.exports = { extractTextFromBuffer };
