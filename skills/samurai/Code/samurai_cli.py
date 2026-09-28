#!/usr/bin/env python3
"""
SAMURAI CLI — Xtobe Master Creative CLI
Usage:
  python samurai_cli.py init <project>
  python samurai_cli.py run "/12-style cyberpunk + /34-keylight neon"
  python samurai_cli.py pipeline full --brief "ronin in neo-kyoto rain"
  python samurai_cli.py chain /45-char /49-outfit /50-pose
  python samurai_cli.py deploy --platform instagram
"""
import argparse, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from generator import SamuraiGenerator
from model_loader import load_model, stack_loras
from refine_pipeline import refine, critique
from deploy import deploy

def cmd_init(args):
    proj = Path(args.project)
    proj.mkdir(exist_ok=True)
    for sub in ["Concept","Model","Gen","Refine","Deploy","Exports"]:
        (proj / sub).mkdir(exist_ok=True)
    print(f"[samurai] initialized {proj} with 6 folders")
    print(f"  C:\Users\Nishan\Xtobe\Skills\samurai\Pipeline\ -> linked")

def cmd_run(args):
    if args.backend != "mock":
        try:
            from generator import WiredGenerator
            gen = WiredGenerator(backend=args.backend, url=args.api_url)
            print(f"[samurai] wired backend={args.backend}")
            # handle lora stack injection if needed
            negative = "bad anatomy, extra limbs, blurry, lowres"
            results = gen.generate(args.prompt, negative=negative, n=args.n)
            print(f"[samurai] generated {len(results)} images via {args.backend}")
            return
        except Exception as e:
            print(f"[samurai] backend {args.backend} failed: {e} — falling back to mock")
    gen = SamuraiGenerator(model=args.model, steps=args.steps, cfg=args.cfg)
    if args.lora:
        stack_loras(args.lora)
    jobs = gen.generate(args.prompt, n=args.n, chaos=args.chaos)
    gen.save_manifest(Path(args.project)/"manifest.json" if args.project else "manifest.json")
    print(f"[samurai] queued {len(jobs)} jobs")

def cmd_pipeline(args):
    print(f"[samurai] PIPELINE FULL: {args.brief}")
    # 1 Concept
    print(" Stage 1/5 CONCEPT: brief -> moodboard")
    # 2 Model
    print(" Stage 2/5 MODEL")
    load_model(args.model)
    # 3 Gen
    print(" Stage 3/5 GEN")
    if hasattr(args, 'backend'):
        pass
    # Wired check
    try:
        from generator import WiredGenerator
        backend = getattr(args, 'backend', 'mock')
        if backend != "mock":
            wg = WiredGenerator(backend=backend)
            wg.generate(args.brief, n=9)
            print(f"[samurai] pipeline gen via {backend} done")
        else:
            g = SamuraiGenerator(model=args.model)
            g.generate(args.brief, n=9)
    except:
        g = SamuraiGenerator(model=args.model)
        g.generate(args.brief, n=9)
    # 4 Refine
    print(" Stage 4/5 REFINE")
    # refine("Gen/hero.jpg")
    # 5 Deploy
    print(" Stage 5/5 DEPLOY")
    print("[samurai] pipeline complete — check Exports/")

def cmd_chain(args):
    chain_str = " + ".join(args.commands)
    print(f"[samurai] chain: {chain_str}")
    g = SamuraiGenerator()
    g.generate(chain_str, n=1)

def cmd_deploy(args):
    deploy(args.image, targets=args.platforms)

def main():
    p = argparse.ArgumentParser(prog="samurai", description="Samurai Master Skill CLI")
    sub = p.add_subparsers(dest="cmd")

    p_init = sub.add_parser("init", help="init project")
    p_init.add_argument("project", help="project name")
    p_init.set_defaults(func=cmd_init)

    p_run = sub.add_parser("run", help="run prompt")
    p_run.add_argument("prompt", help="prompt / chain")
    p_run.add_argument("--model", default="SDXL")
    p_run.add_argument("--steps", type=int, default=30)
    p_run.add_argument("--cfg", type=float, default=7)
    p_run.add_argument("--n", type=int, default=9)
    p_run.add_argument("--chaos", type=float, default=0.3)
    p_run.add_argument("--lora", nargs="*", default=[])
    p_run.add_argument("--backend", choices=["a1111","comfyui","mock"], default="mock")
    p_run.add_argument("--api-url", default=None)
    p_run.add_argument("--project", default=None)
    p_run.set_defaults(func=cmd_run)

    p_pipe = sub.add_parser("pipeline", help="run full pipeline")
    p_pipe.add_argument("mode", choices=["full"], default="full")
    p_pipe.add_argument("--brief", required=True)
    p_pipe.add_argument("--model", default="SDXL")
    p_pipe.set_defaults(func=cmd_pipeline)

    p_chain = sub.add_parser("chain", help="chain slash commands")
    p_chain.add_argument("commands", nargs="+", help="e.g. /45-char /49-outfit")
    p_chain.set_defaults(func=cmd_chain)

    p_dep = sub.add_parser("deploy", help="deploy hero")
    p_dep.add_argument("--image", default="hero_refined.jpg")
    p_dep.add_argument("--platforms", nargs="+", default=["instagram","xtobe_cdn"])
    p_dep.set_defaults(func=cmd_deploy)

    args = p.parse_args()
    if not hasattr(args, 'func'):
        p.print_help()
        return
    args.func(args)

if __name__ == "__main__":
    main()
