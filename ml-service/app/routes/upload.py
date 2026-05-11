from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.csv_service import process_csv_file

router = APIRouter(
    tags=["upload"]
)

@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """
    Endpoint to upload and preview a CSV bank statement.
    """
    # 1. Validate file extension
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .csv files are allowed.")
        
    # Read the file content into memory
    content = await file.read()
    
    # 2. Validate file size (not empty)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty (0 bytes).")
        
    # 3 & 4. Process the file using our service function
    result = process_csv_file(content, file.filename)
    
    return result
