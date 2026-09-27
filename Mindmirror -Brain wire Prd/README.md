
# Xtobe-MindMirror OS v1.0 - All-in-One

64 threads -> 1024 electrodes -> Decoder -> Twin -> Action

Structure:
- core/ : N1 ingestion, signal processing, decoder
- xtobe/ : twin_model, memory_store, fusion_engine (All-in-One AI)
- connector/ : xtobe_connector (hardware bus)
- api/ : FastAPI endpoints
- database/ : schema.sql

Quick Start:
pip install numpy fastapi uvicorn torch
uvicorn api.main:app --reload

Endpoints:
GET /ingest -> live electrode stream
GET /decode -> vx, vy, click
GET /twin/query -> twin context
GET /fuse -> final fused action

Roadmap Stage 1-5 included in docs/mindmirror_spec.html
