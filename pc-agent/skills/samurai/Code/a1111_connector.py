"""
SAMURAI a1111_connector.py — Automatic1111 API Bridge
Docs: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API
"""
import requests, base64, time, json
from pathlib import Path
from PIL import Image
import io

class A1111Connector:
    def __init__(self, url="http://127.0.0.1:7860"):
        self.url = url.rstrip('/')
        self.session = requests.Session()
        print(f"[A1111] Connected to {self.url}")

    def check(self):
        try:
            r = self.session.get(f"{self.url}/sdapi/v1/options", timeout=3)
            return r.status_code == 200
        except:
            print(f"[A1111] NOT reachable at {self.url} — using mock mode")
            return False

    def txt2img(self, prompt, negative="", steps=30, cfg=7, seed=-1, width=1024, height=1024, sampler="DPM++ 2M Karras", model=None, lora_stack=None):
        """
        lora_stack: [{"name":"samurai_armor","weight":0.8}]
        """
        # Inject LoRAs into prompt
        lora_str = ""
        if lora_stack:
            for l in lora_stack:
                lora_str += f" <lora:{l['name']}:{l['weight']}>"

        payload = {
            "prompt": prompt + lora_str,
            "negative_prompt": negative,
            "steps": steps,
            "cfg_scale": cfg,
            "seed": seed,
            "width": width,
            "height": height,
            "sampler_name": sampler,
            "n_iter": 1,
            "batch_size": 1,
            "save_images": True
        }

        if not self.check():
            # Mock return for testing without server
            print(f"[A1111 MOCK] Would generate: {prompt[:80]}... lora={lora_str}")
            return {"images": [], "info": json.dumps({"seed": 1337}), "mock": True}

        print(f"[A1111] Generating {width}x{height} steps={steps} cfg={cfg}")
        r = self.session.post(f"{self.url}/sdapi/v1/txt2img", json=payload, timeout=120)
        r.raise_for_status()
        data = r.json()

        # Save first image
        if data.get("images"):
            img_data = base64.b64decode(data["images"][0])
            out = Path(f"a1111_{int(time.time())}.png")
            out.write_bytes(img_data)
            print(f"  -> saved {out}")
            return {"path": str(out), "info": data.get("info")}

        return data

    def batch(self, prompts, negative="", **kwargs):
        results = []
        for i, p in enumerate(prompts):
            print(f"[A1111 BATCH] {i+1}/{len(prompts)}")
            res = self.txt2img(p, negative=negative, seed=1000+i*1337, **kwargs)
            results.append(res)
            time.sleep(0.5)
        return results

if __name__ == "__main__":
    conn = A1111Connector()
    conn.txt2img("ronin in neo-kyoto rain, cyberpunk, kodak portra 400", "bad hands, blurry")
