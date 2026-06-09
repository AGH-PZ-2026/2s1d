def test_generate_batch_qr_pdf_success(client):
    payload = {"item_ids": [101, 102, 103, 104], "size": "medium"}
    response = client.post("/api/v1/batch-qr/print", json=payload)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers["content-disposition"]
    assert "qr_labels.pdf" in response.headers["content-disposition"]


def test_generate_batch_qr_pdf_empty_list(client):
    payload = {"item_ids": [], "size": "small"}
    response = client.post("/api/v1/batch-qr/print", json=payload)

    assert response.status_code == 422
