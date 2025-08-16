# 📘 DocumInt — Document Intelligence (PDF Outline, Retrieval, and AI Insights)

## Libraries Used
- **FastAPI**: 0.111+ (backend API server)  
- **Uvicorn**: 0.30+ (ASGI server for FastAPI)  
- **NumPy**: 1.24.3 (numerical computations)  
- **scikit-learn**: 1.3.0 (cosine similarity, tokenization utilities)  
- **PyTorch**: 2.0.1 (CPU version for embeddings backend)  
- **transformers**: 4.35.2 (embedding models)  
- **sentence-transformers**: 2.5.1 (embeddings for retrieval)  
- **rank-bm25**: 0.2.2 (BM25 scoring)  
- **PyMuPDF (fitz)**: 1.23.8 (PDF parsing & text extraction)  
- **Adobe PDF Embed SDK** (frontend viewer integration)  
- **TailwindCSS + React** (frontend UI styling and interactivity)  

---

## System Requirements
- **Python**: 3.10+ (tested with 3.11/3.12)  
- **Node.js**: 18+ and **npm** 9+  
- **Memory**: 500MB–1GB recommended (for embeddings + indexing)  
- **Storage**: ~1GB for models, caches, and temporary files  
- **Network**: Required for downloading models (70MB+) and optional Gemini/Azure API usage  

---

## Key Features and Metrics
- **Hybrid Retrieval**: BM25 + Sentence Embeddings with domain-specific weighting  
- **PDF Outline Extraction**:
  - Built-in TOC when available
  - Manual TOC parsing
  - Heuristic fallback (fonts, regex, layout)  
- **Content Chunking**: Heading-aware segmentation, page-aware attribution  
- **Persona + Task Driven Search**  
- **AI Insights**:
  - Region-based (drag area on PDF → Gemini insights)  
  - Inline popover for selections  
  - Server-side Gemini analysis for contextual snippets  
- **Optional Podcastify**: Generate conversational scripts  
- **Azure TTS Integration**: Stream audio from text analysis  

**Performance (local tests)**:
- PDF Outline extraction: ~1–2s per file  
- Hybrid retrieval build: ~2–4s per PDF (100–200 chunks)  
- Region insights: <3s latency (client → Gemini → UI)  

---

## 📁 File Structure
```
DocumInt/
├── Backend/
│   ├── app.py               # FastAPI backend (APIs, Gemini, Azure TTS)
│   ├── pdf_extractor.py     # Outline + TOC extractor
│   ├── run_pipeline.py      # CLI batch pipeline
│   ├── src/
│   │   ├── extract/         # heading_extractor.py, content_chunker.py
│   │   ├── retrieval/       # hybrid_retriever.py
│   │   ├── output/          # formatter.py
│   │   └── utils/           # file_utils.py
│   └── requirements.txt     # Backend dependencies
│
└── Frontend/ (React + Vite)
    ├── src/components/      # PDFViewer, OutlineSidebar, Chat, Insights
    ├── src/hooks/           # useAdobePDFNavigation, geminiService
    ├── index.html
    ├── vite.config.js
    └── tailwind.config.js
```

---

## 🔧 Prerequisites
### For Backend
- Python 3.10+  
- pip package manager  
- Internet (for downloading SentenceTransformers model)  

### For Frontend
- Node.js 18+  
- npm 9+  

### Required API Keys
- **Adobe PDF Embed API** → `VITE_ADOBE_API_KEY`  
- **Google Gemini API** → `VITE_GEMINI_API_KEY`  
- **Azure Speech (TTS)** → `SPEECH_KEY`, `SPEECH_REGION`  

---

## 🚀 Execution

### Local Execution

**Backend**
```bash
cd Backend
python -m venv venv
source venv/bin/activate      # Linux/macOS
venv\Scripts\activate       # Windows

pip install -r requirements.txt
uvicorn app:app --reload
```

**Frontend**
```bash
cd Frontend
npm install
npm run dev
```

Backend runs on: `http://localhost:8000`  
Frontend runs on: `http://localhost:5173`  

---



---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/extract-outline` | POST (file) | Extract title + structured outline |
| `/cache-pdfs` | POST (files[]) | Upload and cache PDFs |
| `/cache-status/{cache_key}` | GET | Check cache status |
| `/query-pdfs` | POST | Hybrid retrieval (persona + task) |
| `/analyze-chunks-with-gemini` | POST | AI-enhanced retrieval |
| `/podcastify-analysis` | POST | Generate conversational script |
| `/tts` | POST | Azure TTS (streaming audio) |

---



---

## 🏗️ Technical Implementation Details

### Core Algorithm
1. **Hybrid Retrieval (src/retrieval/hybrid_retriever.py)**  
   - **BM25**: Optimized k1/b per domain (Travel, Research, Business, Culinary, General)  
   - **Sentence Embeddings**: `paraphrase-MiniLM-L3-v2`  
   - **Scoring**: Weighted BM25 + embedding similarity  
   - **Domain-specific weights**:  
     - Travel → BM25(60%) + Embeddings(40%)  
     - Research → BM25(40%) + Embeddings(60%)  
     - Business → 50/50  
     - Culinary → BM25(70%) + Embeddings(30%)  

2. **Document Processing (src/extract/)**  
   - **Heading Detection**: Font size ratio, regex, position heuristics  
   - **Chunking**: Heading-based, page attribution, fallback single-chunk  

3. **Query Enhancement**  
   - Domain detection from persona/task  
   - Synonym expansion per domain (e.g., “recipe” → “dish, meal, preparation”)  

4. **Result Diversity**  
   - Remove near-duplicates (heading & doc-based diversity)  
   - Emphasize first-page and heading text  

---

 

---

## ⚠️ Error Handling & Robustness
- **Fallbacks**: BM25-only if embeddings/Gemini unavailable  
- **PDF parsing**: Skips errors gracefully, continues indexing  
- **Strict JSON Output**: Ensures schema consistency  
- **Key Security**: All API keys must be stored in `.env`  

---

## 🛠️ Advanced Features
- Region-select insights with Adobe PDF Embed + PDF.js  
- Persona-driven optimization for retrieval  
- Azure TTS for audio podcast mode  
- Modular backend for plugging in other LLMs  

---

## 📜 License
MIT License.
