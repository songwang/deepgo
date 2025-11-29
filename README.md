# DeepGo Local Setup

A simplified version of katagui (Go game interface) with local KataGo server, designed to run on Windows without PostgreSQL and Redis dependencies.

![Go Game Screenshot](screenshot.png)

## Features

✅ **Beautiful Original UI** - Preserves the elegant katagui interface design  
✅ **Local KataGo AI** - Runs on your own hardware for privacy and speed  
✅ **Multi-language Support** - Korean, Chinese, Japanese, English  
✅ **No Database Dependencies** - Simplified setup, no PostgreSQL/Redis required  
✅ **Self-play Mode** - Watch AI vs AI games  
✅ **Full Go Gameplay** - 19x19 board, handicap, komi, scoring  

## Quick Start

### Prerequisites

- Python 3.9+
- KataGo installed and in system PATH
- Windows (tested on Windows 10/11)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/deepgo-local.git
cd deepgo-local
```

2. **Download a KataGo model** (if not included):
   - Download a model from [KataGo releases](https://github.com/lightvector/KataGo/releases)
   - Place the `.bin.gz` file in `katago-server/` directory

3. **Start KataGo server:**
```bash
cd katago-server
pip install --user -r simple_requirements.txt
python katago_server_windows.py
```

4. **Start game frontend** (new terminal):
```bash
cd katagui
pip install --user -r simple_requirements.txt
python simple_app_minimal.py
```

5. **Play Go:**
   - Open browser to `http://localhost:8000`
   - Click "New Game"
   - Start playing!

## Project Structure

```
deepgo-local/
├── katago-server/          # KataGo AI backend
│   ├── katago_server_windows.py  # Windows-compatible server
│   ├── simple_requirements.txt   # Minimal dependencies
│   └── *.cfg               # KataGo configuration files
├── katagui/                # Web frontend
│   ├── simple_app_minimal.py    # Main Flask app
│   ├── templates/          # Original katagui templates
│   ├── static/            # CSS, JavaScript, images
│   └── translations.py    # Multi-language support
├── CLAUDE.md              # Development guide
├── WORK_NOTES.md          # Implementation details
└── README.md              # This file
```

## Language Support

Click the flag icons at the bottom to switch languages:
- 🇺🇸 English
- 🇰🇷 Korean (한국어)
- 🇨🇳 Chinese (中文)
- 🇯🇵 Japanese (日本語)

## What Works vs What Doesn't

### ✅ Working Features
- Full Go gameplay (move, pass, undo, score)
- AI opponents with adjustable strength
- Game controls (handicap, komi settings)
- Self-play mode
- Multi-language interface
- Beautiful original UI design

### ❌ Not Implemented (Simplified Version)
- User registration/login
- Game saving/loading
- Watching other players' games
- Chat functionality
- Game history/search
- Email features

## Development

See [WORK_NOTES.md](WORK_NOTES.md) for detailed implementation notes and [CLAUDE.md](CLAUDE.md) for development guidelines.

## Credits

- Original katagui by Andreas Hauenstein
- KataGo by David Wu (lightvector)
- Simplified for local use with help from Claude AI

## License

This project is based on the original katagui and katago-server projects. Please respect their original licenses and terms of use.