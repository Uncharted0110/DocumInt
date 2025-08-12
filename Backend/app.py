from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cache for PDF embeddings and indices
pdf_cache: Dict[str, Any] = {}
executor = ThreadPoolExecutor(max_workers=4)

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
async def cache_pdfs(files: List[UploadFile] = File(...)):
    """
    Cache PDF files and prepare embeddings for persona-based retrieval
    """
    try:
        # Create temporary directory for PDFs
        temp_dir = tempfile.mkdtemp()
        pdf_files = []
        
        # Save uploaded PDFs to temporary directory
        for file in files:
            if not file.filename.lower().endswith('.pdf'):
                continue
                
            file_path = os.path.join(temp_dir, file.filename)
            content = await file.read()
            
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            pdf_files.append(file_path)
        
        if not pdf_files:
            raise HTTPException(status_code=400, detail="No valid PDF files provided")
        
        # Process PDFs in background
        loop = asyncio.get_event_loop()
        cache_key = str(uuid.uuid4())
        
        # Start processing in background
        asyncio.create_task(process_pdfs_background(cache_key, pdf_files, temp_dir))
        
        return {
            "cache_key": cache_key,
            "message": "PDFs are being processed in background",
            "pdf_count": len(pdf_files)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error caching PDFs: {str(e)}")

async def process_pdfs_background(cache_key: str, pdf_files: List[str], temp_dir: str):
    """
    Process PDFs in background to create embeddings and cache
    """
    try:
        # Extract chunks from PDFs
        extractor = PDFHeadingExtractor()
        all_chunks = []
        
        for pdf_file in pdf_files:
            print(f"🔍 Processing {os.path.basename(pdf_file)}")
            headings = extractor.extract_headings(pdf_file)
            chunks = extract_chunks_with_headings(pdf_file, headings)
            all_chunks.extend(chunks)
        
        # Build hybrid index
        detected_domain = detect_domain("general", "general")
        retriever = build_hybrid_index(all_chunks, domain=detected_domain)
        
        # Cache the results
        pdf_cache[cache_key] = {
            "retriever": retriever,
            "chunks": all_chunks,
            "domain": detected_domain,
            "pdf_files": [os.path.basename(f) for f in pdf_files]
        }
        
        print(f"✅ Cached {len(all_chunks)} chunks for cache key: {cache_key}")
        
    except Exception as e:
        print(f"❌ Error processing PDFs: {str(e)}")
    finally:
        # Clean up temporary directory
        import shutil
        try:
            shutil.rmtree(temp_dir)
        except:
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
                    "section_title": chunk.get('heading', 'No heading'),
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

@app.get("/cache-status/{cache_key}")
async def get_cache_status(cache_key: str):
    """
    Check if PDF cache is ready
    """
    if cache_key in pdf_cache:
        cached_data = pdf_cache[cache_key]
        return {
            "ready": True,
            "chunk_count": len(cached_data["chunks"]),
            "pdf_files": cached_data["pdf_files"],
            "domain": cached_data["domain"]
        }
    else:
        return {"ready": False}

@app.post("/analyze-chunks-with-gemini")
async def analyze_chunks_with_gemini(
    cache_key: str = Form(...),
    persona: str = Form(...),
    task: str = Form(...),
    k: int = Form(default=5),
    gemini_api_key: str = Form(...),
    analysis_prompt: str = Form(default="Analyze this document section and provide key insights, important facts, and connections to the user's task."),
    max_chunks_to_analyze: int = Form(default=3),
    gemini_model: str = Form(default="gemini-2.5-flash")
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
                    api_key=gemini_api_key,
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
    """
    Call the Gemini API to analyze text
    """
    import httpx
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 4096,
        },
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH", 
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if not response.is_success:
                error_text = await response.aread()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Gemini API error: {response.status_code} - {error_text.decode()}"
                )
            
            data = response.json()
            
            # Extract the generated text from Gemini response
            if "candidates" in data and len(data["candidates"]) > 0:
                candidate = data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    parts = candidate["content"]["parts"]
                    if len(parts) > 0 and "text" in parts[0]:
                        return parts[0]["text"]
            
            # Fallback if structure is unexpected
            return "No analysis generated by Gemini"
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Gemini API request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Network error calling Gemini API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error calling Gemini API: {str(e)}")


class PodcastifyRequest(BaseModel):
    analysis: Dict[str, Any]                      # Full JSON from /analyze-chunks-with-gemini
    gemini_api_key: str
    gemini_model: Optional[str] = "gemini-2.5-flash"
    style: Optional[str] = "engaging, educational, conversational"
    audience: Optional[str] = "general technical audience"
    duration_hint: Optional[str] = "3-5 minutes"
    host_names: Optional[List[str]] = ["Host A", "Host B"]

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

        hosts = (req.host_names or ["Host A", "Host B"])
        if len(hosts) < 2:
            hosts = ["Host A", "Host B"]

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
            api_key=req.gemini_api_key,
            model=req.gemini_model or "gemini-2.5-flash"
        )

        return {
            "metadata": {
                "persona": persona,
                "job_to_be_done": job,
                "domain": domain,
                "used_model": req.gemini_model or "gemini-2.5-flash",
                "host_names": hosts
            },
            "podcast_script": script
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating podcast script: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)