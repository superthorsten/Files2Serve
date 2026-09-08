# Files2Serve Agent Guide

## Project shape

- `app.py` contains the FastAPI application and currently owns `GET /` and `POST /upload`.
- `templates/index.html` is the Jinja2 upload UI.
- `uploads/` is runtime storage for uploaded files; treat its contents as untrusted data.
- `requirements.txt` is the dependency source of truth.

## Development commands

Install dependencies with `python -m pip install -r requirements.txt`.
Run locally with `uvicorn app:app --reload` (or the matching executables from `.venv/bin/`).
There is currently no test suite or test configuration. At minimum, run a Python syntax/import check and exercise changed HTTP behavior locally.

## Implementation conventions

- Keep the small single-module FastAPI structure unless a change clearly needs a new boundary.
- Preserve the existing tab indentation in `app.py`.
- Reuse the existing Jinja2 template and dependency choices before adding abstractions or packages.
- Keep setup, endpoint, or security changes documented in `README.md`.

## Security expectations

- Filenames, uploaded content, paths, credentials, and sharing tokens are untrusted input.
- Do not add download or sharing behavior without explicit path containment, safe overwrite handling, access control, and focused tests for denied and malformed inputs.
- Do not claim HTTPS or password protection unless it is implemented and verified; transport security may require deployment or reverse-proxy configuration.
- Avoid exposing `uploads/`, secrets, virtual environments, or generated files through new routes or repository changes.

For security-sensitive work, use the [Secure File Server agent](.github/agents/secure-fileserver.agent.md). For FastAPI setup and verification, see the [FastAPI skill](.github/skills/fastapi-hello-world/SKILL.md). Project goals are documented in the [README](README.md).
