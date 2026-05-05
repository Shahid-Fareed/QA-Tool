const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

/**
 * Extract text from a buffer based on MIME type.
 * @param {Buffer} buffer
 * @param {string} fileType - MIME type
 * @returns {Promise<string>}
 */
async function extractTextFromBuffer(buffer, fileType) {
  try {
    if (fileType === "application/pdf") {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (
      fileType.startsWith("text/") ||
      fileType === "application/javascript" ||
      fileType === "application/x-javascript" ||
      fileType === "application/typescript" ||
      fileType === "application/x-typescript" ||
      fileType === "application/json"
    ) {
      return buffer.toString("utf-8");
    }
    throw new Error(`Unsupported file type: ${fileType}`);
  } catch (error) {
    console.error("[parser] Extraction Error:", error);
    throw error;
  }
}

module.exports = { extractTextFromBuffer };
