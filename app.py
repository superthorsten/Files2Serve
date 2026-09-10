#!/usr/bin/env python3

import json
from datetime import date
import os
from pathlib import Path
import re
import secrets
from shutil import copyfileobj
import shutil

import uvicorn
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import tomli as tomllib

from helpers import create_hash

BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

app = FastAPI(title="Files2Serve", docs_url=None, redoc_url=None, openapi_url=None)
security = HTTPBasic()
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")


@app.get("/")
def read_root(request: Request):
	return templates.TemplateResponse(request=request, name="index.html")


def require_admin(credentials: HTTPBasicCredentials = Depends(security)) -> str:
	if not ADMIN_PASSWORD:
		raise HTTPException(status_code=503, detail="Admin-Bereich ist nicht konfiguriert")
	if not (
		secrets.compare_digest(credentials.username, ADMIN_USERNAME)
		and secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
	):
		raise HTTPException(
			status_code=401,
			detail="Ungültige Zugangsdaten",
			headers={"WWW-Authenticate": "Basic"},
		)
	return credentials.username


@app.post("/upload")
async def upload_file(
	file: UploadFile = File(...),
	title: str = Form(...),
	item_id: str = Form("", alias="id"),
	password: str = Form(""),
	expiry_date: str = Form("", alias="expiry_date"),
	description: str = Form(""),
	_: str = Depends(require_admin),
) -> RedirectResponse:
	filename = Path(file.filename or "").name
	if not filename:
		return RedirectResponse(url="/internal-admin", status_code=303)
	if expiry_date and (
		not re.fullmatch(r"\d{4}-\d{2}-\d{2}", expiry_date)
		or _is_invalid_date(expiry_date)
	):
		return RedirectResponse(url="/internal-admin?error=expiry_date", status_code=303)

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
		"expiry_date": expiry_date,
		"description": description,
		"filename": filename,
		"upload_hash": upload_hash,
	}
	if password.strip():
		metadata["password"] = password
	metadata_file.write_text(
		"".join(f"{key} = {json.dumps(value)}\n" for key, value in metadata.items()),
		encoding="utf-8",
	)

	await file.close()
	return RedirectResponse(url="/internal-admin", status_code=303)


def _is_invalid_date(value: str) -> bool:
	try:
		expiry = date.fromisoformat(value)
	except ValueError:
		return True
	return expiry <= date.today()


def _admin_files() -> list[dict[str, str]]:
	files = []
	for metadata_file in UPLOADS_DIR.glob("*.toml"):
		upload_hash = metadata_file.stem
		if not re.fullmatch(r"[0-9a-f]{16}", upload_hash):
			continue
		try:
			metadata = tomllib.loads(metadata_file.read_text(encoding="utf-8"))
		except (OSError, tomllib.TOMLDecodeError):
			continue
		files.append({
				"hash": upload_hash,
				"title": str(metadata.get("title", "")),
				"item_id": str(metadata.get("id", "")),
				"password": str(metadata.get("password", "")),
				"filename": str(metadata.get("filename", "")),
				"expiry_date": str(metadata.get("expiry_date", "")),
				"description": str(metadata.get("description", "")),
			})
	return sorted(files, key=lambda item: item["hash"])


@app.get("/internal-admin")
def admin_page(request: Request, _: str = Depends(require_admin)):
	return templates.TemplateResponse(
		request=request,
		name="admin.html",
		context={"files": _admin_files()},
	)


@app.post("/internal-admin/{upload_hash}/delete")
def delete_upload(upload_hash: str, _: str = Depends(require_admin)) -> RedirectResponse:
	if not re.fullmatch(r"[0-9a-f]{16}", upload_hash):
		raise HTTPException(status_code=404, detail="Datei nicht gefunden")

	upload_directory = UPLOADS_DIR / upload_hash
	metadata_file = UPLOADS_DIR / f"{upload_hash}.toml"
	if not upload_directory.is_dir() or upload_directory.parent != UPLOADS_DIR:
		raise HTTPException(status_code=404, detail="Datei nicht gefunden")

	shutil.rmtree(upload_directory)
	metadata_file.unlink(missing_ok=True)
	return RedirectResponse(url="/internal-admin", status_code=303)


if __name__ == "__main__":
	uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
