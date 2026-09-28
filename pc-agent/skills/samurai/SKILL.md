---
name: samurai
description: Samurai shadow skill — all 99 slash commands + deep creative pipeline merged into one kill weapon.
version: 1.0.0
author: Nishan
license: MIT
tags: [samurai, slash-commands, prompt-engineering, deep-learning, creative, e2e, pipeline, all-in-one]
metadata:
  hermes:
    tags: [samurai, slash-commands, prompt-engineering, deep-learning, creative, e2e, pipeline]
    related_skills: [prompt-engineering, e2e-deep-creative, mind-mirror, hermes-agent]
---

## When to Use
This is the master samurai skill — combine ALL capabilities into one command. Use when you need the full weapon: slash commands + deep creative pipeline + prompt engineering.

## Kill Phases
- Phase 1: Slash Command Selection (choose your weapon)
- Phase 2: Creative Pipeline Activation (deep learning / generative art)
- Phase 3: Production & Deployment (ship it)

# SAMURAI — Full Build Skill Structure

All 99 prompt commands + e2e deep creative pipeline, merged into one system.

---

## PART 1: SLASH COMMAND SYSTEM (99 Commands)

### Category 1: Human & Tone (1-11)
- /human: Natural writing in a human style
- /expert: Answers at an expert level
- /ceo: Analyze with the mindset of a company founder
- /viral: Ideas for highly engaging content
- /seo: Search-engine-optimized content
- /critic: Identify weaknesses and flaws
- /teacher: Clear and simple explanation
- /eli5: Explain it to me as if I were five
- /brief: The shortest possible answer
- /strategy: Long-term strategic planning
- /copywriter: Persuasive marketing copy

### Category 2: Research & Analysis (12-22)
- /research: In-depth research
- /brainstorm: Generate creative ideas
- /promptengineer: Improve any prompt
- /summarize: Summarize the main points
- /simplify: Simplify complex content
- /detailed: Provide a comprehensive explanation
- /stepbystep: Explain step by step
- /examples: Provide practical examples
- /analyst: Analyze data or information
- /compare: Compare multiple options
- /proscons: Present the pros and cons

### Category 3: Productivity & Planning (23-33)
- /decision: Help in making the best decision
- /planner: Build an actionable plan
- /roadmap: Create a roadmap to achieve a goal
- /action: Turn ideas into practical steps
- /prioritize: Arrange tasks according to importance
- /productivity: Improve productivity
- /focus: Identify the most important task
- /time: Create a time-management plan
- /learn: Build a learning plan
- /study: Create an effective study strategy
- /quiz: Test knowledge with questions

### Category 4: Writing & Career (34-44)
- /flashcards: Create educational flashcards for memorization
- /interview: Prepare for interviews
- /resume: Improve resume content
- /career: Provide career guidance
- /mentor: Respond as a personal mentor
- /coach: Provide practical training
- /consultant: Provide professional recommendations
- /editor: Improve clarity and quality
- /proofread: Identify grammatical and spelling errors
- /rewrite: Rewrite in a better style
- /professional: Make the writing professional

### Category 5: Communication & Content (45-55)
- /casual: Make the writing conversational
- /friendly: Make the writing warm and friendly
- /persuasive: Make the message more persuasive
- /concise: Remove unnecessary words
- /polish: Improve the final version
- /tone: Adjust the writing tone
- /storyteller: Turn information into a story
- /hook: Create attention-grabbing openings
- /headline: Create strong headlines
- /caption: Write captions for social media platforms
- /linkedin: Create content for LinkedIn

### Category 6: Marketing & Social Media (56-66)
- /instagram: Create content for Instagram
- /youtube: Create content for YouTube
- /reels: Generate short-video ideas
- /script: Write a video or presentation script
- /email: Write an effective email
- /sales: Create sales-focused messages
- /offer: Create an irresistible offer
- /brand: Develop a brand message
- /customer: Think from the customer's perspective
- /audience: Analyze the target audience
- /competitor: Analyze competitors

### Category 7: Business & Strategy (67-77)
- /market: Analyze market opportunities
- /startup: Think like an expert strategist for startups
- /business: Develop business ideas
- /pricing: Develop a pricing strategy
- /funnel: Build a marketing funnel
- /growth: Identify growth opportunities
- /content: Build a content strategy
- /calendar: Create a content calendar
- /ideas: Generate new ideas
- /creative: Think creatively and differently
- /unpopular: Challenge conventional ideas

### Category 8: Critical Thinking (78-88)
- /devilsadvocate: Discuss the opposing viewpoint
- /contrarian: Discover alternative viewpoints
- /assumptions: Identify hidden assumptions
- /risks: Identify potential risks
- /factcheck: Separate facts from claims
- /verify: Identify what needs to be verified
- /logic: Examine reasoning and logic
- /rootcause: Identify the root cause of the problem
- /debug: Identify problems and fix them
- /solution: Generate practical solutions
- /alternative: Suggest better alternatives

### Category 9: Optimization & Structure (89-99)
- /optimize: Improve an existing approach
- /automate: Find ways to automate the task
- /template: Create a reusable template
- /checklist: Create a practical checklist
- /framework: Build an organized framework
- /matrix: Organize options in a decision matrix
- /table: Convert information into a table
- /json: Structure the answer in JSON format
- /roleplay: Simulate a realistic scenario
- /reverse: Work backwards from the desired result
- /ultimate: Provide the most comprehensive answer

---

## PART 2: E2E DEEP CREATIVE PIPELINE

### Creative Personas (Slash Commands)
- /dream: Neural-network psychedelic visualization
- /psyche: Psychovisual coding, frequency-domain abstractions
- /deep: Deep learning art, gradient ascent, feature amplification
- /trance: Abstract generative art, flow fields, noise patterns
- /sacred: Geometric sacred architecture, golden ratio, fractals
- /void: Minimalist dark aesthetics, negative space

### Production Modes
- /e2e: Full pipeline: concept to model to visualize to refine to deploy
- /stage: Single pipeline stage execution
- /debug: Pipeline debugging, inspect intermediates
- /deploy: Production deployment, optimize, export, ship

### Creative Directions
- /organic: Organic flowing forms, natural patterns
- /crystal: Geometric crystal structures, hard edges, symmetry
- /liquid: Fluid dynamics, liquid chrome, water simulations
- /nova: Cosmic themes, stars, nebulae, supernova
- /tribe: Tribal/ancient patterns, stone carvings, cave art

### Pipeline Stages
- Stage 1: Concept & Input — Brief, source imagery, constraints
- Stage 2: Model Selection — DeepDream, DVC, Style Transfer, StyleGAN, Diffusion
- Stage 3: Generation & Visualization — Gradient ascent, layer amplification, frequency analysis
- Stage 4: Refinement & Composition — Compositing, color grading, upscaling, curation
- Stage 5: Production & Deployment — PNG/MP4/WebGL, interactive web, app stores

### DeepDream Quick Start (Python)
```python
import tensorflow as tf
from PIL import Image

model = tf.keras.applications.InceptionV3(include_top=False, weights='imagenet')
dream_layers = ['mixed3', 'mixed4', 'mixed5']

def deepdream(image, model, layers, steps=100, step_size=0.01):
    img = tf.Variable(image)
    for step in range(steps):
        with tf.GradientTape() as tape:
            tape.watch(img)
            activation = model(img)
            loss = tf.reduce_mean([tf.reduce_mean(activation[l]) for l in layers])
        gradients = tape.gradient(loss, img)
        gradients /= tf.math.reduce_std(gradients) + 1e-8
        img.assign_add(gradients * step_size)
    return img.numpy()
```

### Psychovisual Pipeline (DVC)
Based on arXiv 2605.29260v1 — Deep Psychovisual Image Representations:
- Learned frequency-domain representations from 1990s image codes
- Data-driven spectral filters for semantic structures
- Phasor Blocks for complex-valued feature encoding
- Less depth-dependent than CNNs for scaling

### Tools & Stack
- Python: TensorFlow/PyTorch, OpenCV, NumPy/SciPy, Matplotlib/Pillow
- Creative Coding: p5.js, Processing/py5, TouchDesigner, Hydra, Shadertoy
- Pipeline: hermes-agent, Docker, GitHub Actions, MLflow

---

## PART 3: COMBINED COMMAND COMBOS

### Prompt + Creative Combos
- /human /dream — Natural style psychedelic visualization
- /ceo /deep — CEO-level deep learning art direction
- /viral /psyche — Viral frequency-domain creative content
- /expert /trance — Expert abstract generative art
- /strategy /nova — Strategic cosmic-themed creative
- /copywriter /liquid — Persuasive fluid-design copy

### Productivity + Creative Combos
- /research /dream — Research-based neural visualization
- /planner /e2e — Planned end-to-end creative pipeline
- /roadmap /deep — Deep learning project roadmap
- /focus /void — Focused minimalist creative work
- /time /organic — Timed organic creative sessions

### Business + Creative Combos
- /market /creative — Market-driven creative ideation
- /startup /dream — Startup pitch psychedelic visualization
- /brand /sacred — Brand identity in sacred geometry
- /content /trance — Content strategy in abstract forms
- /growth /nova — Growth hacking with cosmic visuals

### Critical Thinking + Creative Combos
- /devilsadvocate /deep — Challenge deep learning approaches
- /factcheck /psyche — Verify psychovisual data accuracy
- /risks /void — Risk assessment in minimalist frameworks
- /rootcause /trance — Root cause analysis through abstract patterns
- /debug /e2e — Debug the full pipeline

---

## PART 4: PROJECT INTEGRATION STRUCTURE

```
Xtobe/
├── Skills/
│   └── samurai/
│       ├── SKILL.md          ← This file
│       ├── commands/
│       │   ├── category-1-human-tone.md
│       │   ├── category-2-research.md
│       │   ├── category-3-productivity.md
│       │   ├── category-4-writing.md
│       │   ├── category-5-communication.md
│       │   ├── category-6-marketing.md
│       │   ├── category-7-business.md
│       │   ├── category-8-critical-thinking.md
│       │   └── category-9-optimization.md
│       ├── pipeline/
│       │   ├── stage-1-concept.md
│       │   ├── stage-2-model.md
│       │   ├── stage-3-generation.md
│       │   ├── stage-4-refinement.md
│       │   └── stage-5-deployment.md
│       ├── code/
│       │   ├── deepdream.py
│       │   ├── psychovisual.py
│       │   ├── neural-style.py
│       │   └── pipeline-engine.py
│       └── templates/
│           ├── prompt-templates.md
│           ├── creative-briefs.md
│           └── deployment-checklist.md
```

---

## PART 5: QUALITY GATES

- Each command produces verifiable output
- Each pipeline stage produces inspectable artifacts
- Intermediate results versioned
- Human curation at refinement stage
- Final output tested across contexts
- Documentation auto-generated
- Safety: No medical/therapeutic claims, no fake science

---

## PART 6: SAFETY & ETHICS

- Creative expression only
- No medical/therapeutic claims for visual outputs
- Frequency/wellness claims not scientifically validated
- Outputs are artistic interpretations
- No deepfake or misleading content generation
- Respect privacy and consent

---

## Author
Built for Nishan — Samurai shadow skill, full kill weapon.
All 99 commands + deep creative pipeline merged.
Xtobe AI — C:\Users\Nishan\Xtobe\Skills\samurai\
