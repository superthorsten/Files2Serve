#!/usr/bin/env python3

import json
from datetime import date
from pathlib import Path
import re
from shutil import copyfileobj

import uvicorn
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from helpers import create_hash

BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

app = FastAPI(title="Files2Serve")


@app.get("/")
def read_root(request: Request):
	return templates.TemplateResponse(request=request, name="index.html")


@app.post("/upload")
async def upload_file(
	file: UploadFile = File(...),
	title: str = Form(...),
	item_id: str = Form("", alias="id"),
	password: str = Form(""),
	expiry_date: str = Form("", alias="expiry_date"),
	description: str = Form(""),
) -> RedirectResponse:
	filename = Path(file.filename or "").name
	if not filename:
		return RedirectResponse(url="/", status_code=303)
	if expiry_date and (
		not re.fullmatch(r"\d{4}-\d{2}-\d{2}", expiry_date)
		or _is_invalid_date(expiry_date)
	):
		return RedirectResponse(url="/?error=expiry_date", status_code=303)

	upload_hash = create_hash()
	upload_directory = UPLOADS_DIR / upload_hash
	upload_directory.mkdir(parents=True, exist_ok=False)
	destination = upload_directory / filename
	with destination.open("wb") as output_file:
		copyfileobj(file.file, output_file)

	metadata_file = UPLOADS_DIR / f"{upload_hash}.toml"
	metadata = {
		"title": title,
		"id": item_id,
		"password": password,
		"expiry_date": expiry_date,
		"description": description,
		"filename": filename,
	}
	metadata_file.write_text(
		"".join(f"{key} = {json.dumps(value)}\n" for key, value in metadata.items()),
		encoding="utf-8",
	)

	await file.close()
	return RedirectResponse(url="/", status_code=303)


def _is_invalid_date(value: str) -> bool:
	try:
		expiry = date.fromisoformat(value)
	except ValueError:
		return True
	return expiry <= date.today()


@app.get("/debug")
def debug():
	
	myhash = create_hash()

	return {
		"message": "Debug endpoint active",
		"number": 42,
		"enabled": True,
		"hash": myhash,
	}


if __name__ == "__main__":
	uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
