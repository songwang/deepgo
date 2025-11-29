# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeepGo is a complete Go (Weiqi/Baduk) game system consisting of two main components:

- **katago-server**: A REST API backend that provides KataGo AI move suggestions and game analysis
- **katagui**: A web frontend that provides a complete Go playing interface with real-time game features

## Architecture

### katago-server
- Flask-based REST API exposing KataGo functionality
- Provides `/select-move/<botname>` and `/score/<botname>` endpoints
- Communicates with KataGo binary via GTP (Go Text Protocol)
- Designed for deployment on Heroku with CPU-only execution
- Uses gunicorn as WSGI server

### katagui  
- Flask web application with WebSocket support for real-time features
- Uses PostgreSQL for persistent data (users, games, etc.)
- Redis for WebSocket message passing to game observers
- Jinja2 templates with custom Go board rendering
- Mobile-optimized interface design

## Development Commands

### katago-server
```bash
# Run development server
python katago_server.py

# Run with gunicorn locally  
gunicorn katago_server_eigen:app -w 1

# Test API endpoints
curl -d '{"board_size":19, "moves":["R4", "D16"]}' -H "Content-Type: application/json" -X POST http://127.0.0.1:2718/select-move/katago_gtp_bot
curl -d '{"board_size":19, "moves":["R4", "D16"]}' -H "Content-Type: application/json" -X POST http://127.0.0.1:2718/score/katago_gtp_bot
```

### katagui
```bash
# Set up environment variables (create .env from heroku config)
source .env

# Run development server with WebSocket support
gunicorn -k flask_sockets.worker heroku_app:app -w 1 -b 0.0.0.0:8000 --reload --timeout 1000

# Install dependencies
pip install -r requirements.txt
```

## Key Files and Structure

### katago-server
- `katago_server.py`: Main entry point for different KataGo configurations
- `katago_gtp_bot.py`: GTP protocol communication with KataGo binary
- `get_bot_app.py`: Flask app factory with bot endpoints
- `gtp_*.cfg`: KataGo configuration files for different board sizes/strengths
- `katago_eigen`: CPU-only KataGo binary for Heroku deployment

### katagui
- `heroku_app.py`: Main Flask application entry point
- `katago_gui/`: Main application package
  - `routes.py`, `routes_api.py`, `routes_watch.py`: URL routing and handlers
  - `dbmodel.py`: PostgreSQL database models
  - `auth.py`, `forms.py`: User authentication and form handling
  - `go_utils.py`, `goboard_fast.py`: Go game logic and board representation
  - `sgf.py`: SGF (Smart Game Format) parsing and generation
  - `static/`: Frontend assets (CSS, JavaScript, images)
  - `templates/`: Jinja2 HTML templates

## Database Setup

PostgreSQL tables are automatically created on first startup via `create_tables.py`. Redis is used for WebSocket message passing between game observers.

## Deployment

Both components are designed for Heroku deployment:
- Use buildpacks: `heroku-community/apt` for katago-server (boost library)
- Environment variables configured via `heroku config`
- Procfile defines gunicorn startup commands