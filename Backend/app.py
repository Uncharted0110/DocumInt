from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from io import BytesIO
import html
import tempfile
import os
import sys
import uuid
import json
from pathlib import Path
import aiofiles
from pdf_extractor import PDFOutlineExtractor
from typing import List, Dict, Any
import asyncio
from concurrent.futures import ThreadPoolExecutor
from src.extract import PDFHeadingExtractor
from src.extract.content_chunker import extract_chunks_with_headings
from src.retrieval.hybrid_retriever import build_hybrid_index, search_top_k_hybrid
from src.output.formatter import format_bm25_output
from src.utils.file_utils import load_json, save_json, ensure_dir
from pydantic import BaseModel
from typing import Optional
from hashlib import sha256
from datetime import datetime, timezone
import re
import shutil
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constant for missing heading label
NO_HEADING = 'No heading'

# Global cache for PDF embeddings and indices
pdf_cache: Dict[str, Any] = {}
executor = ThreadPoolExecutor(max_workers=4)

# Persistence directories
BASE_DATA_DIR = Path(os.environ.get("DOCUMINT_DATA_DIR", "./data/projects")).resolve()
BASE_DATA_DIR.mkdir(parents=True, exist_ok=True)

META_FILENAME = "meta.json"
CHUNKS_FILENAME = "chunks.json"

# Constants
GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'
HOST_A = 'Host A'
HOST_B = 'Host B'

# ---------------- Persistence Helpers -----------------

def _safe_project_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]", "_", name)[:100] if name else "project"

def _project_path(project_name: str) -> Path:
    return BASE_DATA_DIR / _safe_project_name(project_name)

def _meta_path(project_name: str) -> Path:
    return _project_path(project_name) / META_FILENAME

def _chunks_path(project_name: str) -> Path:
    return _project_path(project_name) / CHUNKS_FILENAME

def load_project_meta(project_name: str) -> Dict[str, Any] | None:
    p = _meta_path(project_name)
    if p.exists():
        try:
            return json.load(open(p, "r", encoding="utf-8"))
        except Exception:
            return None
    return None

def load_project_chunks(project_name: str) -> List[Dict[str, Any]]:
    p = _chunks_path(project_name)
    if p.exists():
        try:
            return json.load(open(p, "r", encoding="utf-8"))
        except Exception:
            return []
    return []

def save_project_state(project_name: str, meta: Dict[str, Any], chunks: List[Dict[str, Any]]):
    proj_dir = _project_path(project_name)
    proj_dir.mkdir(parents=True, exist_ok=True)
    meta = {**meta, "updated_at": datetime.now(timezone.utc).isoformat()}
    with open(_meta_path(project_name), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    with open(_chunks_path(project_name), "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2)

# -------------- Hash Utilities -----------------

def hash_bytes(data: bytes) -> str:
    return sha256(data).hexdigest()

# -------------- Existing endpoints --------------

def detect_domain(persona: str, task: str) -> str:
    """Detect domain from persona and task for optimized parameters"""
    combined_text = f"{persona} {task}".lower()
    domain_keywords = {
        'travel': ['travel', 'trip', 'vacation', 'tourist', 'planner', 'itinerary', 'destination'],
        'research': ['research', 'study', 'analysis', 'investigation', 'academic', 'paper'],
        'business': ['business', 'professional', 'hr', 'compliance', 'management', 'form'],
        'culinary': ['food', 'cooking', 'recipe', 'chef', 'culinary', 'menu', 'ingredient']
    }
    for domain, keywords in domain_keywords.items():
        if any(keyword in combined_text for keyword in keywords):
            return domain
    return 'general'

@app.get("/")
async def root():
    return {"message": "DocumInt Backend API"}

@app.post("/extract-outline")
async def extract_pdf_outline(file: UploadFile = File(...)):
    """
    Extract outline/table of contents from uploaded PDF file
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    temp_file_path = None
    try:
        # Create unique temporary file path
        temp_dir = tempfile.gettempdir()
        unique_filename = f"pdf_{uuid.uuid4().hex}.pdf"
        temp_file_path = os.path.join(temp_dir, unique_filename)
        
        # Read uploaded file content
        content = await file.read()
        
        # Write to temporary file using aiofiles
        async with aiofiles.open(temp_file_path, 'wb') as temp_file:
            await temp_file.write(content)
        
        # Initialize PDF extractor
        extractor = PDFOutlineExtractor()
        
        # Extract outline from PDF
        result = extractor.extract_outline(temp_file_path)
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        # Clean up temporary file in case of error
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except OSError:
                pass
        
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/cache-pdfs")
async def cache_pdfs(project_name: str = Form(""), files: List[UploadFile] = File(...)):
    """
    Cache PDF files and prepare embeddings for persona-based retrieval.
    Supports project-level persistence: if project_name is supplied, previously processed
    PDFs are reused and only new PDFs are processed. Cached chunks persisted on disk.
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No PDF files provided")

        safe_name = _safe_project_name(project_name) if project_name else "session_" + uuid.uuid4().hex[:8]
        existing_meta = load_project_meta(safe_name) or {"project_name": safe_name, "files": []}
        existing_files_meta: List[Dict[str, Any]] = existing_meta.get("files", [])
        existing_hashes = {f.get("hash") for f in existing_files_meta}
        existing_chunks: List[Dict[str, Any]] = load_project_chunks(safe_name)

        new_pdf_paths: List[str] = []
        new_files_meta: List[Dict[str, Any]] = []
        temp_dir: Optional[str] = None

        # Collect truly new PDFs
        for file in files:
            if not file.filename.lower().endswith('.pdf'):
                continue
            content = await file.read()
            file_hash = hash_bytes(content)
            if file_hash in existing_hashes:
                continue  # already processed
            if temp_dir is None:
                temp_dir = tempfile.mkdtemp()
            file_path = os.path.join(temp_dir, file.filename)
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            new_pdf_paths.append(file_path)
            new_files_meta.append({
                "name": file.filename,
                "hash": file_hash,
                "size": len(content)
            })

        cache_key = str(uuid.uuid4())
        pdf_cache[cache_key] = {"processing": True, "project_name": safe_name, "chunks": existing_chunks, "pdf_files": [f["name"] for f in existing_files_meta]}

        # Case 1: Reuse existing (have chunks, no new files)
        if not new_pdf_paths and existing_chunks:
            try:
                detected_domain = detect_domain("general", "general")
                retriever = build_hybrid_index(existing_chunks, domain=detected_domain)
                pdf_cache[cache_key] = {
                    "retriever": retriever,
                    "chunks": existing_chunks,
                    "domain": detected_domain,
                    "pdf_files": [f["name"] for f in existing_files_meta],
                    "project_name": safe_name,
                    "reused": True
                }
                return {
                    "cache_key": cache_key,
                    "message": "Reused existing project cache",
                    "pdf_count": len(existing_files_meta),
                    "project_name": safe_name,
                    "reused": True
                }
            except Exception as e:
                # If index build fails (e.g. empty/invalid chunks) surface gracefully
                pdf_cache[cache_key] = {
                    "error": f"Index build failed: {e}",
                    "chunks": existing_chunks,
                    "project_name": safe_name
                }
                raise HTTPException(status_code=500, detail=f"Error rebuilding existing cache: {e}")

        # Case 2: Nothing to do (no existing chunks & no new files)
        if not new_pdf_paths and not existing_chunks:
            pdf_cache[cache_key] = {
                "empty": True,
                "project_name": safe_name,
                "chunks": [],
                "pdf_files": []
            }
            return {
                "cache_key": cache_key,
                "message": "No PDFs to process (no new files and no cached data)",
                "pdf_count": 0,
                "project_name": safe_name,
                "reused": False,
                "empty": True
            }

        # Case 3: Process new files (possibly with existing chunks)
        def run_bg():
            try:
                process_pdfs_background(cache_key, new_pdf_paths, temp_dir, safe_name, existing_chunks, existing_meta, new_files_meta)
            except Exception as e:
                pdf_cache[cache_key] = {"error": f"Processing failed: {e}", "project_name": safe_name}

        task = asyncio.create_task(asyncio.to_thread(run_bg))
        pdf_cache[cache_key]["task"] = task

        return {
            "cache_key": cache_key,
            "message": f"Processing {len(new_pdf_paths)} new PDF(s); {len(existing_chunks)} previously cached",
            "pdf_count": len(new_pdf_paths),
            "project_name": safe_name,
            "reused": False
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error caching PDFs: {str(e)}")

def process_pdfs_background(cache_key: str, pdf_files: List[str], temp_dir: Optional[str], project_name: str, existing_chunks: List[Dict[str, Any]], existing_meta: Dict[str, Any], new_files_meta: List[Dict[str, Any]]):
    """Synchronous processing run in background task."""
    try:
        extractor = PDFHeadingExtractor()
        all_chunks = list(existing_chunks)

        for pdf_file in pdf_files:
            try:
                print(f"🔍 Processing {os.path.basename(pdf_file)} (project: {project_name})")
                headings = extractor.extract_headings(pdf_file)
                chunks = extract_chunks_with_headings(pdf_file, headings)
                all_chunks.extend(chunks)
            except Exception as e:
                print(f"❌ Error processing {pdf_file}: {e}")

        if not all_chunks:
            # Nothing extracted – store placeholder
            save_project_state(project_name, {**existing_meta, "files": existing_meta.get("files", []) + new_files_meta, "domain": "general"}, [])
            pdf_cache[cache_key] = {
                "chunks": [],
                "domain": "general",
                "pdf_files": [f["name"] for f in (existing_meta.get("files", []) + new_files_meta)],
                "project_name": project_name,
                "empty": True
            }
            print(f"⚠️ No chunks extracted for project '{project_name}'.")
            return

        detected_domain = detect_domain("general", "general")
        try:
            retriever = build_hybrid_index(all_chunks, domain=detected_domain)
        except Exception as e:
            print(f"❌ Index build failed for project {project_name}: {e}")
            retriever = None

        merged_files_meta = existing_meta.get("files", []) + new_files_meta
        save_project_state(project_name, {**existing_meta, "files": merged_files_meta, "domain": detected_domain}, all_chunks)

        pdf_cache[cache_key] = {
            "retriever": retriever,
            "chunks": all_chunks,
            "domain": detected_domain,
            "pdf_files": [f["name"] for f in merged_files_meta],
            "project_name": project_name,
            "index_error": retriever is None
        }
        print(f"✅ Cached {len(all_chunks)} total chunks for project '{project_name}' (cache key {cache_key})")
    except Exception as e:
        print(f"❌ Error processing PDFs for project {project_name}: {e}")
    finally:
        if temp_dir:
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass

@app.post("/query-pdfs")
async def query_pdfs(
    cache_key: str = Form(...),
    persona: str = Form(...),
    task: str = Form(...),
    k: int = Form(default=5)
):
    """
    Query cached PDFs using persona-based retrieval
    """
    try:
        if cache_key not in pdf_cache:
            raise HTTPException(status_code=404, detail="Cache key not found. Please upload PDFs first.")
        
        cached_data = pdf_cache[cache_key]
        retriever = cached_data["retriever"]
        chunks = cached_data["chunks"]
        
        print(f"🔍 Querying with persona: {persona}, task: {task}")
        print(f"📊 Found {len(chunks)} chunks in cache")
        
        # Detect domain for this specific query
        detected_domain = detect_domain(persona, task)
        print(f"🎯 Detected domain: {detected_domain}")
        
        # Search with hybrid retrieval
        query = f"{persona} {task}"
        print(f"🔍 Searching with query: '{query}'")
        
        try:
            top_chunks = search_top_k_hybrid(retriever, query, persona=persona, task=task, k=k)
            print(f"✅ Found {len(top_chunks)} top chunks")
        except Exception as search_error:
            print(f"❌ Search error: {str(search_error)}")
            raise HTTPException(status_code=500, detail=f"Search error: {str(search_error)}")
        
        # Format results for frontend
        results = []
        for i, chunk in enumerate(top_chunks):
            try:
                result = {
                    "document": chunk.get('pdf_name', 'Unknown'),
                    "section_title": chunk.get('heading', NO_HEADING),
                    "refined_text": chunk.get('content', chunk.get('text', 'No content')),
                    "page_number": chunk.get('page_number', 1),
                    "importance_rank": chunk.get('hybrid_score', 0),
                    "bm25_score": chunk.get('bm25_score', 0),
                    "embedding_score": chunk.get('embedding_score', 0)
                }
                results.append(result)
                print(f"📄 Result {i+1}: {result['document']} - {result['section_title']}")
            except Exception as chunk_error:
                print(f"❌ Error processing chunk {i}: {str(chunk_error)}")
                continue
        
        print(f"✅ Returning {len(results)} results")
        
        return {
            "metadata": {
                "input_documents": cached_data["pdf_files"],
                "persona": persona,
                "job_to_be_done": task,
                "domain": detected_domain
            },
            "extracted_sections": results,
            "subsection_analysis": results  # Using same results for both for now
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error querying PDFs: {str(e)}")

@app.get("/project-cache/{project_name}")
async def get_project_cache(project_name: str):
    """Return project metadata if persisted (without loading into memory)."""
    meta = load_project_meta(project_name)
    if not meta:
        return {"exists": False}
    chunks = load_project_chunks(project_name)
    return {
        "exists": True,
        "project_name": project_name,
        "pdf_files": [f.get("name") for f in meta.get("files", [])],
        "file_count": len(meta.get("files", [])),
        "chunk_count": len(chunks),
        "updated_at": meta.get("updated_at"),
        "domain": meta.get("domain", "general")
    }

@app.get("/cache-status/{cache_key}")
async def get_cache_status(cache_key: str):
    """
    Check if PDF cache is ready
    """
    if cache_key in pdf_cache and 'retriever' in pdf_cache[cache_key]:
        cached_data = pdf_cache[cache_key]
        return {
            "ready": True,
            "chunk_count": len(cached_data["chunks"]),
            "pdf_files": cached_data["pdf_files"],
            "domain": cached_data["domain"],
            "project_name": cached_data.get("project_name")
        }
    elif cache_key in pdf_cache:
        entry = pdf_cache[cache_key]
        return {"ready": False, "project_name": entry.get("project_name")}
    else:
        return {"ready": False}

@app.post("/analyze-chunks-with-gemini")
async def analyze_chunks_with_gemini(
    cache_key: str = Form(...),
    persona: str = Form(...),
    task: str = Form(...),
    k: int = Form(default=5),
    gemini_api_key: str = os.getenv("VITE_GEMINI_API_KEY"),
    analysis_prompt: str = Form(default="Analyze this document section and provide key insights, important facts, and connections to the user's task."),
    max_chunks_to_analyze: int = Form(default=3),
    gemini_model: str = Form(default=GEMINI_DEFAULT_MODEL)
):
    """
    Query cached PDFs, get top chunks, and analyze them with Gemini AI
    """
    try:
        # First, get the top chunks using existing retrieval logic
        if cache_key not in pdf_cache:
            raise HTTPException(status_code=404, detail="Cache key not found. Please upload PDFs first.")
        
        cached_data = pdf_cache[cache_key]
        retriever = cached_data["retriever"]
        chunks = cached_data["chunks"]
        
        print(f"🔍 Querying with persona: {persona}, task: {task}")
        print(f"📊 Found {len(chunks)} chunks in cache")
        
        # Get top chunks using hybrid retrieval
        query = f"{persona} {task}"
        print(f"🔍 Searching with query: '{query}'")
        
        try:
            top_chunks = search_top_k_hybrid(retriever, query, persona=persona, task=task, k=k)
            print(f"✅ Found {len(top_chunks)} top chunks")
        except Exception as search_error:
            print(f"❌ Search error: {str(search_error)}")
            raise HTTPException(status_code=500, detail=f"Search error: {str(search_error)}")
        
        # Prepare chunks for Gemini analysis
        chunks_to_analyze = top_chunks[:max_chunks_to_analyze]
        gemini_results = []
        
        print(f"🤖 Starting Gemini analysis of {len(chunks_to_analyze)} chunks...")
        
        # Process each chunk with Gemini
        for i, chunk in enumerate(chunks_to_analyze):
            try:
                chunk_content = chunk.get('content', chunk.get('text', ''))
                chunk_heading = chunk.get('heading', 'No heading')
                pdf_name = chunk.get('pdf_name', 'Unknown')
                
                # Create context-aware prompt
                contextual_prompt = f"""
You are analyzing a document section for a user with the following context:
- User Persona: {persona}
- User Task: {task}
- Document: {pdf_name}
- Section: {chunk_heading}

{analysis_prompt}

Please provide insights that are specifically relevant to this user's persona and task.
Document Section:
{chunk_content}
"""
                
                print(f"🔍 Analyzing chunk {i+1}/{len(chunks_to_analyze)} with Gemini...")
                
                # Call Gemini API
                gemini_response = await call_gemini_api(
                    prompt=contextual_prompt,
                    api_key=os.getenv("VITE_GEMINI_API_KEY"),
                    model=gemini_model
                )
                
                gemini_result = {
                    "chunk_index": i,
                    "document": pdf_name,
                    "section_title": chunk_heading,
                    "page_number": chunk.get('page_number', 1),
                    "original_content": chunk_content,
                    "retrieval_scores": {
                        "hybrid_score": chunk.get('hybrid_score', 0),
                        "bm25_score": chunk.get('bm25_score', 0),
                        "embedding_score": chunk.get('embedding_score', 0)
                    },
                    "gemini_analysis": gemini_response,
                    "analysis_timestamp": asyncio.get_event_loop().time()
                }
                
                gemini_results.append(gemini_result)
                
                # Add delay between API calls to respect rate limits
                if i < len(chunks_to_analyze) - 1:
                    await asyncio.sleep(1)  # 1 second delay between calls
                    
            except Exception as chunk_error:
                print(f"❌ Error analyzing chunk {i+1}: {str(chunk_error)}")
                # Add error result to maintain indexing
                gemini_results.append({
                    "chunk_index": i,
                    "document": chunk.get('pdf_name', 'Unknown'),
                    "section_title": chunk.get('heading', 'No heading'),
                    "page_number": chunk.get('page_number', 1),
                    "original_content": chunk.get('content', chunk.get('text', '')),
                    "retrieval_scores": {
                        "hybrid_score": chunk.get('hybrid_score', 0),
                        "bm25_score": chunk.get('bm25_score', 0),
                        "embedding_score": chunk.get('embedding_score', 0)
                    },
                    "gemini_analysis": f"Error analyzing this chunk: {str(chunk_error)}",
                    "analysis_timestamp": asyncio.get_event_loop().time(),
                    "error": True
                })
                continue
        
        print(f"✅ Gemini analysis complete. Processed {len(gemini_results)} chunks")
        
        # Return comprehensive results
        return {
            "metadata": {
                "input_documents": cached_data["pdf_files"],
                "persona": persona,
                "job_to_be_done": task,
                "domain": cached_data["domain"],
                "total_chunks_found": len(top_chunks),
                "chunks_analyzed": len(chunks_to_analyze),
                "gemini_model": gemini_model
            },
            "retrieval_results": [
                {
                    "document": chunk.get('pdf_name', 'Unknown'),
                    "section_title": chunk.get('heading', 'No heading'),
                    "content": chunk.get('content', chunk.get('text', 'No content')),
                    "page_number": chunk.get('page_number', 1),
                    "hybrid_score": chunk.get('hybrid_score', 0),
                    "bm25_score": chunk.get('bm25_score', 0),
                    "embedding_score": chunk.get('embedding_score', 0)
                }
                for chunk in top_chunks
            ],
            "gemini_analysis": gemini_results,
            "summary": {
                "top_insights": [result["gemini_analysis"][:200] + "..." if len(result["gemini_analysis"]) > 200 else result["gemini_analysis"] for result in gemini_results if not result.get("error", False)]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing chunks with Gemini: {str(e)}")


async def call_gemini_api(prompt: str, api_key: str, model: str = "gemini-2.0-flash-exp") -> str:
    """Call the Gemini API to analyze text. Falls back gracefully if httpx is missing."""
    # Dynamic import so requirement is optional
    try:
        import httpx  # type: ignore
        has_httpx = True
    except ImportError:  # pragma: no cover
        httpx = None     # type: ignore
        has_httpx = False

    if not has_httpx:
        # Return a sentinel string instead of raising so callers can continue
        return "[Gemini unavailable: 'httpx' not installed on server]"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 4096,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:  # type: ignore
            response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            if not response.is_success:
                error_text = await response.aread()
                return f"[Gemini API error {response.status_code}: {error_text.decode(errors='ignore')[:300]}]"
            data = response.json()
    except Exception as e:  # Network / timeout / other
        return f"[Gemini request failed: {e}]"

    try:
        candidates = data.get("candidates") or []
        if candidates:
            parts = (candidates[0].get("content") or {}).get("parts") or []
            if parts and isinstance(parts, list):
                text = parts[0].get("text")
                if isinstance(text, str) and text.strip():
                    return text
        return "[No analysis generated by Gemini]"
    except Exception as e:
        return f"[Gemini parse error: {e}]"


class PodcastifyRequest(BaseModel):
    analysis: Dict[str, Any]                      # Full JSON from /analyze-chunks-with-gemini
    gemini_api_key: str = os.getenv("VITE_GEMINI_API_KEY")
    gemini_model: Optional[str] = GEMINI_DEFAULT_MODEL
    style: Optional[str] = "engaging, educational, conversational"
    audience: Optional[str] = "general technical audience"
    duration_hint: Optional[str] = "3-5 minutes"
    host_names: Optional[List[str]] = [HOST_A, HOST_B]

@app.post("/podcastify-analysis")
async def podcastify_analysis(req: PodcastifyRequest):
    try:
        meta = (req.analysis or {}).get("metadata", {}) or {}
        persona = meta.get("persona", "Unknown Persona")
        job = meta.get("job_to_be_done", "Unknown Job")
        domain = meta.get("domain", "general")

        # Trim inputs to keep the prompt reasonable
        retrieval = (req.analysis or {}).get("retrieval_results", []) or []
        retrieval = retrieval[:5]

        analyses = (req.analysis or {}).get("gemini_analysis", []) or []
        analyses = [a for a in analyses if not a.get("error")][:3]

        insights = ((req.analysis or {}).get("summary", {}) or {}).get("top_insights", []) or []
        insights = insights[:6]

        hosts = (req.host_names or [HOST_A, HOST_B])
        if len(hosts) < 2:
            hosts = [HOST_A, HOST_B]

        # Build a podcast-style prompt
        prompt = f"""
You are a scriptwriter creating a short podcast conversation.

Constraints:
- Style: {req.style}
- Audience: {req.audience}
- Duration: {req.duration_hint}
- Speakers: {hosts[0]} and {hosts[1]}
- Avoid hallucinations. Use only provided material. Cite document and section casually when relevant.

Context:
- Persona: {persona}
- Job to be done: {job}
- Domain: {domain}

Top Insights:
{chr(10).join(f"- {i}" for i in insights) if insights else "- (none)"}

Key Retrieval Results (document • section • page):
{chr(10).join(f"- {r.get('document','Unknown')} • {r.get('section_title','No section')} • p.{r.get('page_number',1)}" for r in retrieval) if retrieval else "- (none)"}

Analysis Excerpts:
{chr(10).join(f"- {a.get('document','Unknown')} • {a.get('section_title','No section')} (p.{a.get('page_number',1)}): { (a.get('gemini_analysis') or '')[:800] }" for a in analyses) if analyses else "- (none)"}

Task:
Write a podcast script with:
1) A concise intro hook (1–2 lines).
2) A back-and-forth discussion that explains the most important insights clearly, using natural conversational turns.
3) Occasional references to documents/sections (e.g., “in the API Guide, section 3, page 12”).
4) A brief wrap-up with next steps.

Output format (plain text):
Title: <compelling title>
{hosts[0]}: <line>
{hosts[1]}: <line>
... (alternate clearly)
"""

        script = await call_gemini_api(
            prompt=prompt,
            api_key=os.getenv("VITE_GEMINI_API_KEY"),
            model=req.gemini_model or GEMINI_DEFAULT_MODEL
        )

        return {
            "metadata": {
                "persona": persona,
                "job_to_be_done": job,
                "domain": domain,
                "used_model": req.gemini_model or GEMINI_DEFAULT_MODEL,
                "host_names": hosts
            },
            "podcast_script": script
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating podcast script: {str(e)}")

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-AvaMultilingualNeural"
    audio_format: Optional[str] = "mp3"   # "mp3" | "wav"
    speaking_rate: Optional[float] = 1.0  # 0.5 .. 2.0
    pitch: Optional[str] = "0%"           # e.g., "-2%", "+2%"
    lang: Optional[str] = "en-US"

def _build_ssml(text: str, voice: str, rate: float, pitch: str, lang: str) -> str:
    safe = html.escape(text or "")
    # Convert rate multiplier to percentage (1.0 = 100% normal speed)
    rate_pct = rate * 100
    return f"""<speak version="1.0" xml:lang="{lang}">
  <voice name="{voice}">
    <prosody rate="{rate_pct:.0f}%" pitch="{pitch}">{safe}</prosody>
  </voice>
</speak>"""

@app.post("/tts")
async def tts(req: TTSRequest):
    try:
        try:
            import azure.cognitiveservices.speech as speechsdk  # type: ignore
        except ImportError:
            raise HTTPException(status_code=500, detail="azure-cognitiveservices-speech is not installed. pip install azure-cognitiveservices-speech")

        # Support both standard and VITE_* env var names
        speech_key = "3QxG0dKf63DYCJ3viQXNB3FpeKeNBXHYZBr9LgdKP5uypLUbHqxyJQQJ99BHACYeBjFXJ3w3AAAAACOGnhao"
        speech_region = "eastus"
        if not speech_key or not speech_region:
            raise HTTPException(status_code=500, detail="Missing SPEECH_KEY/SPEECH_REGION environment variables")

        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=speech_region)
        # Output format
        fmt = (req.audio_format or "mp3").lower()
        if fmt == "wav":
            speech_config.set_speech_synthesis_output_format(
                speechsdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm
            )
            media_type = "audio/wav"
            filename = "speech.wav"
        else:
            speech_config.set_speech_synthesis_output_format(
                speechsdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3
            )
            media_type = "audio/mpeg"
            filename = "speech.mp3"

        # Build SSML and synthesize to memory (no speakers)
        ssml = _build_ssml(
            text=req.text,
            voice=(req.voice or "en-US-AvaMultilingualNeural"),
            rate=(0.01),
            pitch=(req.pitch or "0%"),
            lang=(req.lang or "en-US"),
        )
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: synthesizer.speak_ssml_async(ssml).get())

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            audio_bytes = bytes(result.audio_data or b"")
            if not audio_bytes:
                raise HTTPException(status_code=500, detail="Azure TTS returned empty audio")
            return StreamingResponse(
                BytesIO(audio_bytes),
                media_type=media_type,
                headers={"Content-Disposition": f'inline; filename="{filename}"'}
            )
        elif result.reason == speechsdk.ResultReason.Canceled:
            details = result.cancellation_details
            msg = f"TTS canceled: {details.reason}. {details.error_details or ''}".strip()
            raise HTTPException(status_code=500, detail=msg)
        else:
            raise HTTPException(status_code=500, detail="Unknown TTS error")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)