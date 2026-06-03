from pydantic import BaseModel


class ImportErrorDetail(BaseModel):
    row_number: int
    error_message: str


class ImportReport(BaseModel):
    total_rows_processed: int
    successful_rows: int
    errors: list[ImportErrorDetail]
