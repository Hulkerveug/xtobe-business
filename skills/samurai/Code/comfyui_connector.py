"""
SAMURAI comfyui_connector.py — ComfyUI API Bridge
Uses ComfyUI's /prompt endpoint with workflow JSON
"""
import requests, json, time, websocket, uuid, random
from pathlib import Path
import os

class ComfyUIConnector:
    def __init__(self, url="http://127.0.0.1:8188"):
        self.url = url.rstrip('/')
        self.client_id = str(uuid.uuid4())
        print(f"[ComfyUI] Connected to {self.url} client={self.client_id[:8]}")

    def check(self):
        try:
            r = requests.get(f"{self.url}/system_stats", timeout=3)
            return r.status_code == 200
        except:
            print(f"[ComfyUI] NOT reachable at {self.url} — mock mode")
            return False

    def load_workflow(self, name="samurai_base.json"):
        # Load from Templates/
        wf_path = Path(__file__).parent.parent / "Templates" / "workflows" / name
        if wf_path.exists():
            return json.loads(wf_path.read_text())
        # Fallback minimal workflow
        return self._default_workflow()

    def _default_workflow(self):
        # Minimal SDXL txt2img workflow
        return {
            "3": {"inputs": {"seed": 1000, "steps": 30, "cfg": 7, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1, "model": ["4",0], "positive": ["6",0], "negative": ["7",0], "latent_image": ["5",0]}, "class_type": "KSampler"},
            "4": {"inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}, "class_type": "CheckpointLoaderSimple"},
            "5": {"inputs": {"width": 1024, "height": 1024, "batch_size": 1}, "class_type": "EmptyLatentImage"},
            "6": {"inputs": {"text": "PROMPT"}, "class_type": "CLIPTextEncode"},
            "7": {"inputs": {"text": "NEGATIVE"}, "class_type": "CLIPTextEncode"},
            "8": {"inputs": {"samples": ["3",0], "vae": ["4",2]}, "class_type": "VAEDecode"},
            "9": {"inputs": {"filename_prefix": "samurai/comfy", "images": ["8",0]}, "class_type": "SaveImage"}
        }

    def queue_prompt(self, prompt, negative="", workflow=None, seed=None, width=1024, height=1024, steps=30, cfg=7):
        if workflow is None:
            workflow = self._default_workflow()

        # Inject prompts
        for node_id, node in workflow.items():
            if node.get("class_type") == "CLIPTextEncode":
                txt = node["inputs"]["text"]
                if "NEGATIVE" in txt.upper() or node_id == "7":
                    workflow[node_id]["inputs"]["text"] = negative
                else:
                    workflow[node_id]["inputs"]["text"] = prompt
            if node.get("class_type") == "KSampler":
                workflow[node_id]["inputs"]["seed"] = seed or random.randint(1, 10**9)
                workflow[node_id]["inputs"]["steps"] = steps
                workflow[node_id]["inputs"]["cfg"] = cfg
            if node.get("class_type") == "EmptyLatentImage":
                workflow[node_id]["inputs"]["width"] = width
                workflow[node_id]["inputs"]["height"] = height

        if not self.check():
            print(f"[ComfyUI MOCK] Would queue: {prompt[:80]}... seed={seed}")
            return {"prompt_id": "mock_"+str(uuid.uuid4()), "mock": True}

        payload = {"prompt": workflow, "client_id": self.client_id}
        r = requests.post(f"{self.url}/prompt", json=payload, timeout=30)
        r.raise_for_status()
        data = r.json()
        print(f"[ComfyUI] Queued prompt_id={data.get('prompt_id')}")
        return data

    def wait_for_image(self, prompt_id, timeout=120):
        # Poll history
        start = time.time()
        while time.time() - start < timeout:
            try:
                r = requests.get(f"{self.url}/history/{prompt_id}", timeout=5)
                if r.status_code == 200:
                    hist = r.json()
                    if prompt_id in hist and hist[prompt_id].get("status", {}).get("completed"):
                        print(f"[ComfyUI] Completed {prompt_id}")
                        return hist[prompt_id]
            except: pass
            time.sleep(2)
        print(f"[ComfyUI] Timeout waiting for {prompt_id}")
        return None

    def batch(self, prompts, negative="", **kwargs):
        results = []
        for i, p in enumerate(prompts):
            pid_data = self.queue_prompt(p, negative=negative, seed=1000+i*1337, **kwargs)
            if not pid_data.get("mock"):
                hist = self.wait_for_image(pid_data["prompt_id"])
                results.append(hist)
            else:
                results.append(pid_data)
        return results

if __name__ == "__main__":
    conn = ComfyUIConnector()
    conn.queue_prompt("ronin in neo-kyoto rain, cyberpunk", "bad hands")
