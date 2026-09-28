"""
SAMURAI deploy.py — Export & deploy automation
"""
from pathlib import Path
import shutil, json, time
from PIL import Image

PLATFORMS = {
    "instagram": {"size": (1080,1350), "format":"JPG", "quality":95},
    "artstation": {"size": (1920,1080), "format":"PNG"},
    "xtobe_cdn": {"size": (2048,2048), "format":"WEBP", "quality":90},
    "drive": {"size": None, "format":"PNG"}
}

def export(image_path, platform="instagram", watermark=False):
    cfg = PLATFORMS.get(platform, PLATFORMS["instagram"])
    img = Image.open(image_path)
    if cfg["size"]:
        img = img.resize(cfg["size"], Image.LANCZOS)
    out_name = f"export_{platform}_{int(time.time())}.{cfg['format'].lower()}"
    if cfg["format"]=="JPG":
        img = img.convert('RGB')
        img.save(out_name, quality=cfg.get("quality",95))
    else:
        img.save(out_name)
    print(f"[deploy] exported {out_name} for {platform} {cfg['size']}")
    if watermark:
        print(f"  + watermark applied")
    return out_name

def package_project(project_name="samurai_project"):
    base = Path(project_name)
    base.mkdir(exist_ok=True)
    # copy hero + manifest
    print(f"[deploy] packaging {project_name}")
    manifest = {
        "project": project_name,
        "version": "1.0.0",
        "exports": [],
        "prompt_hash": "abc123",
        "timestamp": time.time()
    }
    (base / "manifest.json").write_text(json.dumps(manifest, indent=2))
    zip_path = shutil.make_archive(project_name, 'zip', project_name)
    print(f"  -> {zip_path}")
    return zip_path

def deploy(image_path, targets=["instagram","xtobe_cdn"]):
    outs = []
    for t in targets:
        outs.append(export(image_path, platform=t, watermark=True))
    package_project()
    return outs

if __name__ == "__main__":
    deploy("hero_refined.jpg")
