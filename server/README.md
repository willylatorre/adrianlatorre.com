# Playground FastAPI Server

FastAPI backend for the Vue playground.

## Local Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r server/requirements-dev.txt
python -m uvicorn server.main:app --reload --host 0.0.0.0 --port 8080
```

## Environment

- `PORT`: server port, default `8080`
- `DB_PATH`: SQLite path, default `./adrian.db`
- `ENV`: environment label, default `development`
- `OPENAI_API_KEY`: enables chat and image generation
- `OPENAI_MODEL`: chat model, default `gpt-5-mini`

## API Endpoints

- `GET /api/ping`
- `GET /api/coffee`
- `POST /api/coffee/increment`
- `POST /api/chat/message`
- `POST /api/chat/generate-image`

## Tests

```bash
python3 -m pytest server/tests
```
