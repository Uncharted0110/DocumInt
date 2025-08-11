import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Configuration for Gemini API analysis
 */
export interface GeminiConfig {
  apiKey?: string;
  chunkSize?: number;
  maxChunksToProcess?: number;
  delayBetweenCalls?: number;
  model?: string;
}

export interface GeminiInsight {
  chunkIndex: number;
  content: string;
}

/**
 * Default configuration for Gemini processing
 */
const DEFAULT_CONFIG: Required<GeminiConfig> = {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  chunkSize: 3000,
  maxChunksToProcess: 1,
  delayBetweenCalls: 10000, // 10 seconds
  model: "gemini-2.5-flash"
};

/**
 * Creates a delay for rate limiting API calls
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunks text into smaller pieces for processing
 */
function chunkText(text: string, chunkSize: number = 3000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Calls the Gemini API to analyze a text chunk
 */
async function callGeminiForInsights(chunk: string, config: Required<GeminiConfig>): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const prompt = `
  You are an expert document analyst.
  Analyze the following text and provide:
  - Key insights
  - "Did you know?" facts
  - Contradictions
  - Connections to related topics

  Text:
  ${chunk}
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

/**
 * Extracts text from a PDF using PDF.js
 */
async function extractTextFromPDF(url: string): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;

    let allText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(" ");
      allText += text + "\n";
    }
    
    // Clean and normalize text
    return allText.replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  }
}

/**
 * Processes PDF text chunks with Gemini AI
 */
async function processTextWithGemini(
  text: string, 
  config: Required<GeminiConfig>
): Promise<GeminiInsight[]> {
  const chunks = chunkText(text, config.chunkSize);
  const insights: GeminiInsight[] = [];

  const chunksToProcess = Math.min(chunks.length, config.maxChunksToProcess);
  
  for (let i = 0; i < chunksToProcess; i++) {
    console.log(`🔍 Sending chunk ${i + 1}/${chunksToProcess} to Gemini...`);
    
    try {
      const insight = await callGeminiForInsights(chunks[i], config);
      insights.push({
        chunkIndex: i,
        content: insight
      });

      // Add delay between calls to respect rate limits
      if (i < chunksToProcess - 1) {
        await delay(config.delayBetweenCalls);
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      // Continue processing other chunks even if one fails
    }
  }

  return insights;
}

/**
 * Main function to extract text from PDF and analyze with Gemini
 */
export async function extractAndAnalyzePDF(
  pdfUrl: string, 
  userConfig: GeminiConfig = {}
): Promise<GeminiInsight[]> {
  const config: Required<GeminiConfig> = { ...DEFAULT_CONFIG, ...userConfig };

  if (!config.apiKey) {
    console.error("Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.");
    return [];
  }

  try {
    console.log("📄 Extracting text from PDF...");
    const text = await extractTextFromPDF(pdfUrl);
    
    if (!text.trim()) {
      console.warn("No text extracted from PDF");
      return [];
    }

    console.log(`📊 Extracted ${text.length} characters from PDF`);
    
    const insights = await processTextWithGemini(text, config);
    
    console.log("💡 Gemini Analysis Complete:");
    insights.forEach((insight, index) => {
      console.log(`\n--- Insight ${index + 1} ---`);
      console.log(insight.content);
    });

    return insights;
  } catch (error) {
    console.error("Error processing PDF with Gemini:", error);
    return [];
  }
}

/**
 * Utility function to get combined insights as a single string
 */
export function combineInsights(insights: GeminiInsight[], separator: string = "\n\n---\n\n"): string {
  return insights.map(insight => insight.content).join(separator);
}

/**
 * Advanced analysis function with custom prompts
 */
export async function analyzeWithCustomPrompt(
  pdfUrl: string,
  customPrompt: string,
  config: GeminiConfig = {}
): Promise<string[]> {
  const finalConfig: Required<GeminiConfig> = { ...DEFAULT_CONFIG, ...config };

  if (!finalConfig.apiKey) {
    console.error("Gemini API key not found.");
    return [];
  }

  try {
    const text = await extractTextFromPDF(pdfUrl);
    const chunks = chunkText(text, finalConfig.chunkSize);
    const results: string[] = [];

    const chunksToProcess = Math.min(chunks.length, finalConfig.maxChunksToProcess);

    for (let i = 0; i < chunksToProcess; i++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${finalConfig.model}:generateContent?key=${finalConfig.apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: `${customPrompt}\n\nText:\n${chunks[i]}` }] }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        results.push(result);
      }

      if (i < chunksToProcess - 1) {
        await delay(finalConfig.delayBetweenCalls);
      }
    }

    return results;
  } catch (error) {
    console.error("Error in custom analysis:", error);
    return [];
  }
}