import io

import qrcode
from fastapi import APIRouter, Response
from fpdf import FPDF

from app.schemas.batch_qr import QRBatchRequest

router = APIRouter()


@router.post("/print", response_class=Response)
def generate_batch_qr_pdf(request: QRBatchRequest):
    """Generuje plik PDF z kodami QR dla podanej listy przedmiotów."""
    pdf = FPDF()
    pdf.add_page()

    if request.size == "small":
        qr_size, cols = 30, 5
    elif request.size == "large":
        qr_size, cols = 80, 2
    else:  # medium
        qr_size, cols = 50, 3

    margin = 10
    x_start, y_start = margin, margin
    x_pos, y_pos = x_start, y_start

    for index, item_id in enumerate(request.item_ids):
        qr_data = f"ITEM-QR-{item_id}"
        qr = qrcode.make(qr_data)

        img_bytes = io.BytesIO()
        qr.save(img_bytes, format="PNG")

        if index > 0 and index % cols == 0:
            x_pos = x_start
            y_pos += qr_size + margin

            if y_pos + qr_size > 280:
                pdf.add_page()
                y_pos = y_start

        pdf.image(img_bytes, x=x_pos, y=y_pos, w=qr_size, h=qr_size)

        pdf.set_xy(x_pos, y_pos + qr_size)
        pdf.set_font("helvetica", size=8)
        pdf.cell(w=qr_size, h=5, text=f"ID: {item_id}", align="C")

        x_pos += qr_size + margin

    pdf_bytes = bytes(pdf.output())

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=qr_labels.pdf"},
    )
