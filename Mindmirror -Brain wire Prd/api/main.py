
from fastapi import FastAPI
import sys; sys.path.append('..')
from core.n1_ingestion import N1Ingestion
from core.decoder_engine import MindMirrorDecoder
from xtobe.fusion_engine import XtobeAI

app = FastAPI(title="Xtobe-MindMirror OS")
ingestion=N1Ingestion(); decoder=MindMirrorDecoder(); ai=XtobeAI()

@app.get("/ingest")
def ingest(): return {"electrodes": 1024, "threads": 64, "status": "streaming"}

@app.get("/decode")
def decode():
    feat = [0]*1024
    intent = decoder.decode(feat)
    return intent

@app.get("/twin/query")
def twin_query(): return {"twin": "active", "memories": 1248}

@app.get("/fuse")
def fuse():
    intent = decoder.decode([0]*1024)
    action = ai.orchestrate(intent, "user_prefers_fast_cursor")
    return action

# Run: uvicorn api.main:app --reload
