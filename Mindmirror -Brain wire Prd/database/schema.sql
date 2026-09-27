
-- MindMirror Production Schema
CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, created_at TIMESTAMP);
CREATE TABLE neural_sessions (id TEXT PRIMARY KEY, user_id TEXT, started_at TIMESTAMP, n_channels INT DEFAULT 1024);
CREATE TABLE electrode_data (id TEXT PRIMARY KEY, session_id TEXT, electrode_idx INT, voltage FLOAT[], timestamp TIMESTAMP);
CREATE TABLE features (id TEXT PRIMARY KEY, session_id TEXT, electrode_idx INT, firing_rate FLOAT, bin_ms INT);
CREATE TABLE decoder_models (id TEXT PRIMARY KEY, version TEXT, accuracy FLOAT, trained_on TIMESTAMP);
CREATE TABLE intents (id TEXT PRIMARY KEY, session_id TEXT, vx FLOAT, vy FLOAT, click_prob FLOAT, confidence FLOAT);
CREATE TABLE twin_memories (id TEXT PRIMARY KEY, user_id TEXT, content TEXT, embedding VECTOR, source TEXT);
CREATE TABLE behavior_logs (id TEXT PRIMARY KEY, user_id TEXT, text TEXT, action TEXT, preference TEXT);
CREATE TABLE actions (id TEXT PRIMARY KEY, fused_intent JSONB, final_command TEXT, executed_at TIMESTAMP);
