"""
SAMURAI model_loader.py — Checkpoint & LoRA manager
"""
from pathlib import Path
import json

MODELS = {
    "SDXL": "stabilityai/stable-diffusion-xl-base-1.0",
    "PONY": "AstraliteHeart/pony-diffusion-v6-xl",
    "FLUX": "black-forest-labs/FLUX.1-dev",
    "SD3": "stabilityai/stable-diffusion-3-medium"
}

LORAS = {
    "samurai_armor": {"path":"loras/samurai_armor.safetensors", "weight":0.8},
    "neo_kyoto": {"path":"loras/neo_kyoto.safetensors", "weight":0.7},
    "kimono": {"path":"loras/kimono.safetensors", "weight":0.6},
    "cyberpunk": {"path":"loras/cyberpunk.safetensors", "weight":0.75}
}

def load_model(name="SDXL"):
    ckpt = MODELS.get(name, MODELS["SDXL"])
    print(f"[model_loader] Loading {name} -> {ckpt}")
    # from diffusers import StableDiffusionXLPipeline
    # pipe = StableDiffusionXLPipeline.from_pretrained(ckpt)
    # return pipe
    return {"name":name, "ckpt":ckpt, "status":"loaded (mock)"}

def stack_loras(lora_list):
    """
    lora_list: ["samurai_armor:0.9", "neo_kyoto"]
    """
    stack = []
    for item in lora_list:
        if ':' in item:
            name, w = item.split(':')
            w = float(w)
        else:
            name, w = item, 0.8
        info = LORAS.get(name, {"path": f"loras/{name}.safetensors", "weight": w})
        info["weight"] = w
        stack.append({**info, "name":name})
        print(f"  + LoRA {name} weight={w}")
    # conflict detection
    if len(stack)>4:
        print("[WARN] >4 LoRAs may cause style bleed")
    return stack

def save_stack(stack, path="lora_stack.json"):
    Path(path).write_text(json.dumps(stack, indent=2))
    print(f"[model_loader] stack saved {path}")

if __name__ == "__main__":
    load_model("SDXL")
    stack_loras(["samurai_armor:0.9","neo_kyoto:0.7"])
