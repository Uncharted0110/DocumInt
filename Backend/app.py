from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
import sys
import uuid
from pathlib import Path
import aiofiles
from Backend.pdf_extractor import PDFOutlineExtractor

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)