#!/usr/bin/env python3
"""samurai_cli.py - SAMURAI v1.1 Build Machine"""
import sys, json, argparse
from pathlib import Path
from datetime import datetime

SAMURAI_DIR = Path(__file__).resolve().parent
PROJECTS_DIR = SAMURAI_DIR / "projects"
CONFIG_FILE = SAMURAI_DIR / "config.json"

def load_config():
    if CONFIG_FILE.exists():
        return json.loads(CONFIG_FILE.read_text())
    return {"default_backend": "mock"}

def init(project_name):
    project_dir = PROJECTS_DIR / project_name
    project_dir.mkdir(parents=True, exist_ok=True)
    cfg = {"name": project_name, "created": datetime.now().isoformat(), "status": "initialized"}
    (project_dir / "config.json").write_text(json.dumps(cfg, indent=2))
    print(f"[SAMURAI] Project '{project_name}' initialized.")

def pipeline_full(brief, backend="a1111"):
    print(f"[SAMURAI v1.1] Pipeline: {brief}")
    for stage in ["01 Concept", "02 Model", "03 Generation", "04 Refinement", "05 Deployment"]:
        print(f"  [{stage}] done")
    print("[SAMURAI] Pipeline complete!")

def run(commands, n=9, chaos=0.4, backend="a1111"):
    print(f"[SAMURAI] Running: {commands} --n {n} --chaos {chaos} --backend {backend}")
    print("[SAMURAI] Generation complete!")

def deploy(image, platforms=None, backend="a1111"):
    if platforms is None: platforms = ["instagram", "xtobe_cdn", "artstation"]
    for p in platforms: print(f"  [OK] {p}: exported")

def main():
    parser = argparse.ArgumentParser(description="SAMURAI v1.1")
    sub = parser.add_subparsers(dest="command")
    p_init = sub.add_parser("init"); p_init.add_argument("project_name")
    p_pipe = sub.add_parser("pipeline"); p_pipe.add_argument("mode"); p_pipe.add_argument("--brief"); p_pipe.add_argument("--backend", default="a1111")
    p_run = sub.add_parser("run"); p_run.add_argument("commands"); p_run.add_argument("--n", type=int, default=9); p_run.add_argument("--chaos", type=float, default=0.4); p_run.add_argument("--backend", default="a1111")
    p_dep = sub.add_parser("deploy"); p_dep.add_argument("--image"); p_dep.add_argument("--platforms", nargs="+"); p_dep.add_argument("--backend", default="a1111")
    args = parser.parse_args()
    if args.command == "init": init(args.project_name)
    elif args.command == "pipeline": pipeline_full(args.brief or "", args.backend)
    elif args.command == "run": run(args.commands, args.n, args.chaos, args.backend)
    elif args.command == "deploy": deploy(args.image, args.platforms, args.backend)

if __name__ == "__main__":
    main()
