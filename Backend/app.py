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

# Add the 1B system to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from extract.heading_extractor import PDFHeadingExtractor
from extract.content_chunker import extract_chunks_with_headings
from retrieval.hybrid_retriever import build_hybrid_index, search_top_k_hybrid
from output.formatter import format_bm25_output
from utils.file_utils import load_json, save_json, ensure_dir

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)