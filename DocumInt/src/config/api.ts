// API Configuration
export const API_BASE_URL = 'http://localhost:8080';

// API Endpoints
export const API_ENDPOINTS = {
  CACHE_PDFS: `${API_BASE_URL}/cache-pdfs`,
  CACHE_STATUS: (key: string) => `${API_BASE_URL}/cache-status/${key}`,
  QUERY_PDFS: `${API_BASE_URL}/query-pdfs`,
  APPEND_PDF: `${API_BASE_URL}/append-pdf`,
  PROJECT_INSIGHTS: (projectName: string) => `${API_BASE_URL}/projects/${projectName}/insights`,
  PROJECT_INSIGHT: (projectName: string, insightId: string) => `${API_BASE_URL}/projects/${projectName}/insights/${insightId}`,
  INSIGHT_AUDIO: (projectName: string, insightId: string) => `${API_BASE_URL}/insight-audio/${projectName}/${insightId}.mp3`,
  GENERATE_PODCAST: `${API_BASE_URL}/generate-podcast`,
  ANALYZE_CHUNKS: `${API_BASE_URL}/analyze-chunks-with-gemini`,
  EXTRACT_OUTLINE: `${API_BASE_URL}/extract-outline`
};
