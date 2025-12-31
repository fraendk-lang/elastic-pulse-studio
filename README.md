# Elastic Pulse Studio

**Professional WebGL Visual Sequencer** - Create stunning real-time visuals with WebGL shaders, AI-powered generation, and professional-grade automation.

## 🚀 Features

- **24+ Shaders** - Extensive library of GLSL shaders organized by category
- **Audio Reactive** - 10-band spectrum analysis with kick/snare detection
- **Automation Lanes** - Keyframe-based automation with multiple curve types
- **AI Generation** - Neural shader generation powered by Google Gemini
- **MIDI Support** - Full MIDI integration with learn mode
- **Master Effects** - Post-processing effects (Bloom, Feedback, Strobe, etc.)
- **Time Stretching** - Adjust clip playback speed without pitch change
- **Export & Render** - MP4/WebM video export with FFmpeg.wasm
- **Beat Grid & Snap** - Musical beat alignment and snapping
- **LFO System** - Multiple LFO types for parameter modulation
- **9 Blend Modes** - Professional compositing modes
- **Ken Burns Parallax** - Animated backgrounds with parallax effects

## 🛠️ Tech Stack

- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **WebGL/GLSL** - GPU-accelerated rendering
- **Vite** - Lightning-fast build tool
- **Monaco Editor** - Advanced GLSL syntax highlighting
- **FFmpeg.wasm** - Client-side video encoding
- **Web Audio API** - Real-time audio analysis
- **Web MIDI API** - Hardware controller support

## 📦 Installation

### Web Version (Development)

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in `.env.local`:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

### Desktop App (Beta)

#### Build for macOS (DMG):
```bash
npm run electron:build:mac
```
Output: `release/Elastic Pulse Studio-32.11.0.dmg`

#### Build for Windows (.exe):
```bash
npm run electron:build:win
```
Output: `release/Elastic Pulse Studio Setup 32.11.0.exe`

#### Build for both platforms:
```bash
npm run electron:build:all
```

#### Development Mode (Electron):
```bash
npm run electron:dev
```

## 🎨 Usage

1. **Launch Studio** - Click "Launch Studio" on the landing page
2. **Add Shaders** - Select a shader from the Signal Pool and click to add to timeline
3. **Customize** - Adjust parameters in the Inspector panel
4. **Automate** - Add keyframes to create dynamic animations
5. **Export** - Render your visuals as MP4 or WebM video

## 📁 Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── constants/      # Static data (shaders, etc.)
├── public/             # Static assets
│   ├── logo.png        # App logo (for startup overlay)
│   └── app-screenshot.png  # Landing page screenshot
└── index.tsx           # Main application entry point
```

## 🎯 Key Features Explained

### Shader Editor
Monaco-powered GLSL editor with syntax highlighting, real-time compilation, and error detection.

### Audio Reactive System
10-band spectrum analyzer with automatic BPM detection, kick/snare detection, and per-clip audio tie.

### Automation System
Visual automation lanes with keyframe editing, multiple curve types (Linear, Bezier, Ease), and copy/paste functionality.

### AI Shader Generation
Describe your vision in natural language and get production-ready GLSL code instantly.

### MIDI Integration
Map hardware controllers to any parameter with MIDI learn mode for live performance.

## 📝 License

MIT License - See LICENSE file for details

## 👨‍💻 Development

Built with ❤️ using WebGL, React, TypeScript & Vite

---

**Version 32.11** | Titan Core Engine
