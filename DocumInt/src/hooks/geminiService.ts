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

/**
 * Lightweight helper: get insights for an arbitrary text snippet (no PDF extraction)
 */
export async function getInsightsForText(
  text: string,
  userConfig: GeminiConfig = {}
): Promise<string> {
  const config: Required<GeminiConfig> = { ...DEFAULT_CONFIG, ...userConfig } as Required<GeminiConfig>;
  if (!config.apiKey) {
    console.error("Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.");
    return "";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  const prompt = `You are an expert document analyst. Analyze the following selected passage and provide:\n- Key insights\n- Did-you-know facts\n- Contradictions or caveats\n- Related context the reader should know\n\nSelected Text:\n${text}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [ { parts: [{ text: prompt }] } ]
      })
    });
    if (!response.ok) return "";
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) {
    console.error("Gemini insight error:", e);
    return "";
  }
}

// Internal: extract text items that fall inside a device-space rectangle
async function extractTextFromRegion(
  pdfUrl: string,
  pageNumberOneBased: number,
  viewerSize: { width: number; height: number },
  regionInIframe: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumberOneBased);
  const unscaled = page.getViewport({ scale: 1 });
  const scale = viewerSize.width > 0 ? (viewerSize.width / unscaled.width) : 1;
  const viewport = page.getViewport({ scale });

  const textContent = await page.getTextContent();
  const transformPoint = (x: number, y: number) => {
    const [a, b, c, d, e, f] = viewport.transform;
    return {
      X: a * x + c * y + e,
      Y: b * x + d * y + f,
    };
  };
  const within = (bx: number, by: number, bw: number, bh: number) => {
    return !(bx + bw < regionInIframe.x || bx > regionInIframe.x + regionInIframe.width || by + bh < regionInIframe.y || by > regionInIframe.y + regionInIframe.height);
  };

  // Collect items intersecting the region
  const items = textContent.items as any[];
  const picked: Array<{ x: number; y: number; str: string } > = [];
  for (const it of items) {
    const t = it.transform as number[]; // [a,b,c,d,e,f]
    const fontHeight = Math.hypot(t[2], t[3]);
    const x = t[4];
    const yTop = t[5] - fontHeight;
    const { X, Y } = transformPoint(x, yTop);
    const width = (it.width || 0) * scale;
    const height = fontHeight * scale;
    if (within(X, Y, width, height)) {
      picked.push({ x: X, y: Y, str: it.str });
    }
  }

  // Sort roughly top-to-bottom then left-to-right
  picked.sort((a, b) => (Math.abs(a.y - b.y) < 6 ? a.x - b.x : a.y - b.y));
  const text = picked.map(p => p.str).join(" ").replace(/\s+/g, " ").trim();
  try { await pdf.destroy(); } catch {}
  return text;
}

/**
 * Get insights for a selected region (device-space rectangle) on the given page.
 */
export async function getInsightsForRegion(
  pdfUrl: string,
  pageNumberOneBased: number,
  viewerSize: { width: number; height: number },
  regionInIframe: { x: number; y: number; width: number; height: number },
  userConfig: GeminiConfig = {}
): Promise<string> {
  const text = await extractTextFromRegion(pdfUrl, pageNumberOneBased, viewerSize, regionInIframe);
  if (!text) return "";
  return getInsightsForText(text, userConfig);
}