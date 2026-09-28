# WIRED - Samurai v1.1 ComfyUI + A1111

**Samurai v1.1 is now live with ComfyUI + A1111 integration.**

## New Components

### 1. Connectors
- `Code/a1111_connector.py` - Full A1111 API bridge with LoRA injection `<lora:name:weight>`, batch 9 with chaos seeds
- `Code/comfyui_connector.py` - Queues workflow JSON, polls `/history`, supports websocket

### 2. ComfyUI Workflows (ready to import)
- `Workflows/samurai_base.json` - SDXL txt2img base
- `Workflows/samurai_lora_stack.json` - armor 0.9 + neo-kyoto 0.7 stack
- `Workflows/samurai_upscale_facefix.json` - 4x-UltraSharp upscaler

### 3. Updated CLI with --backend flag
```bash
# A1111 - your main backend
samurai.bat run "ronin in neo-kyoto rain, cyberpunk" --backend a1111 --n 9

# ComfyUI
samurai.bat run "samurai armor, 85mm, portra 400" --backend comfyui --n 9

# Mock (no server needed)
samurai.bat run "test" --backend mock

# Full pipeline wired
samurai.bat pipeline full --brief "ronin in neo-kyoto rain" --backend a1111
```

### 4. Config
`config.json` - Change URLs for your setup

### 5. Quick Start
```bash
# 1. Launch A1111 with --api OR ComfyUI with --listen
# 2. Run samurai.bat
samurai.bat init my_project
samurai.bat pipeline full --brief "ronin in neo-kyoto rain" --backend a1111
```

## File Structure (v1.1)

```
samurai/
|-- SKILL.md                  <- Master skill (309 lines)
|-- samurai_cli.py            <- CLI with --backend
|-- samurai.bat               <- Windows launcher
|-- config.json               <- Backend URLs
|-- WIRED.md                  <- This file
|-- Code/a1111_connector.py   <- NEW
|-- Code/comfyui_connector.py <- NEW
|-- Workflows/samurai_base.json       <- NEW
|-- Workflows/samurai_lora_stack.json <- NEW
|-- Workflows/samurai_upscale_facefix.json <- NEW
```

## Safety
- Dry-run is DEFAULT
- Network only to configured backend
- Local machine only
- Hash-chain audit on every step

MIT License - Built for Nishan Ramanathan
