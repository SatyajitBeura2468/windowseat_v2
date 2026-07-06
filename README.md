# 🚃 WindowSeat v2

**A cinematic train-window journey simulator**

WindowSeat is an immersive, endlessly-changing interactive web experience where you sit inside a beautifully rendered Indian railway coach and watch an infinite procedural world scroll past through the window — with evolving weather, time of day, lighting, rare events, and ambient sound.

## ✨ Features

### 🎨 7-Layer Canvas Rendering
- **Sky** — Dynamic gradients, sun/moon, twinkling stars, animated clouds, god rays
- **Background** — Distant mountain silhouettes with atmospheric perspective and snow caps
- **Midground** — Trees, buildings, fields, rivers, villages — the densest visual layer
- **Foreground** — Railway tracks, sleepers, signals, creating the strongest sense of speed
- **Weather** — Rain streaks, drifting snow, fog, lightning with pooled particle systems
- **Interior** — Authentic Indian railway cabin frame with material textures
- **Overlay** — Glass tint, reflections, rain droplets, vignette, lens flare

### 🌍 14 Procedural Biomes
Plains · Farmland · Forest · Hills · Mountains · Village · Station · River · Bridge · Desert · Coastal · Snow · Tunnel · Semi-urban

### 🌦️ Dynamic Weather System
Clear · Cloudy · Rainy · Stormy · Foggy · Snowy — with smooth transitions, lightning flashes, and atmospheric effects

### 🌅 Day/Night Cycle
8 time phases (Dawn → Sunrise → Morning → Noon → Evening → Dusk → Night → Midnight) with cinematic lighting transitions

### 🚂 5 Indian Railway Coach Types
- 🛏️ **Sleeper** — Classic blue-gray metal coach
- 💺 **1st Class AC** — Wood-paneled luxury cabin
- 💺 **Chair Car** — Standard seating with patterned fabric
- 🚄 **Vande Bharat** — Modern premium with LED strips
- 📦 **Luggage Van** — Wide opening, rugged feel

### 🎵 Procedural Audio
Web Audio API synthesized soundscapes — wheel rhythm, cabin hum, wind, rain, thunder — all without external audio files

### 🎲 Seeded Journeys
Every journey is reproducible from a seed number. Same seed = same terrain, weather transitions, and events.

### ✨ Rare Events
Passing trains · Bird flocks · Deer · Rainbows · Station platforms · Distant villages · Lightning · Smoke · Bridge crossings · Tunnel entries

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open **http://localhost:3000** and click anywhere to begin your journey.

## 🎮 Controls

The glassmorphism control panel appears in the bottom-right corner and auto-hides after 4 seconds. Move your mouse to reveal it.

- **Coach** — Select cabin style
- **Weather** — Override weather conditions
- **Time** — Drag the slider to set time of day
- **Motion** — Adjust train sway intensity
- **Seed** — Enter a number or click 🔄 for a random journey
- **Sound** — Toggle ambient audio
- **Focus Mode** — Hide all UI for pure immersion

## 🏗️ Architecture

```
src/
├── main.js              # Bootstrap & game loop
├── config.js            # Shared constants & utilities
├── engine/              # Core systems
│   ├── renderer.js      # Multi-canvas layer manager
│   ├── world.js         # Procedural biome generator
│   ├── weather.js       # Weather state machine
│   ├── timeOfDay.js     # Day/night cycle
│   ├── motion.js        # Train sway simulation
│   ├── audio.js         # Web Audio soundscapes
│   ├── events.js        # Rare event scheduler
│   ├── noise.js         # Simplex noise
│   └── prng.js          # Seeded PRNG
├── layers/              # Canvas rendering layers
│   ├── sky.js           # Atmosphere & celestials
│   ├── background.js    # Distant terrain
│   ├── midground.js     # Trees, buildings, fields
│   ├── foreground.js    # Tracks & near objects
│   ├── weather.js       # Particle effects
│   ├── interior.js      # Cabin frame
│   └── overlay.js       # Glass effects
├── data/                # Configuration data
│   ├── biomes.js        # 14 biome definitions
│   ├── coaches.js       # 5 coach configurations
│   └── palettes.js      # Color palettes
├── ui/                  # Controls
└── styles/              # CSS
```

## 📦 Tech Stack

- **Vite** — Build tooling
- **Vanilla JS** — No framework
- **HTML5 Canvas 2D** — Multi-layer rendering
- **Web Audio API** — Procedural sound
- **Simplex Noise** — Terrain generation
- **Mulberry32 PRNG** — Seeded randomness

## 📄 License

MIT © Satyajit Beura
