#!/usr/bin/env python

# Enhanced version with original katagui UI but simplified backend
# No PostgreSQL or Redis dependencies, just game play

import os, json, random
import requests
from flask import Flask, render_template, jsonify, request, session

app = Flask(__name__)
app.config.update(
    DEBUG = True,
    SECRET_KEY = 'simple_secret_key'
)

# KataGo server URL
KATAGO_SERVER = 'http://localhost:2718'

# Mock translation function (original uses complex translations)
def translate(key):
    translations = {
        'Play': 'Play',
        'Komi': 'Komi', 
        'Pass': 'Pass',
        'Undo': 'Undo',
        'Score': 'Score',
        'New Game': 'New Game',
        'Settings': 'Settings',
        'About': 'About',
        'Your turn': 'Your turn',
        'AI thinking': 'AI thinking'
    }
    return translations.get(key, key)

# Mock logged_in function 
def logged_in():
    return False  # Always guest mode

# Mock random function for templates
def rrand():
    return str(random.uniform(0,1))

# Mock is_mobile function
def is_mobile():
    return session.get('is_mobile', False)

# Mock donation_blurb function
def donation_blurb():
    return ""

# Add template context functions
@app.context_processor
def inject_template_funcs():
    return {
        'tr': translate,
        'logged_in': logged_in,
        'rrand': rrand,
        'is_mobile': is_mobile,
        'donation_blurb': donation_blurb
    }

@app.route('/')
@app.route('/index')
@app.route('/home')
def index():
    """Main entry point with original UI"""
    return render_template('index.tmpl', home=True)

@app.route('/index_mobile')
def index_mobile():
    """Mobile version"""
    session['is_mobile'] = True
    return render_template('index_mobile.tmpl', home=True)

# Mock create_game endpoint (original saves to database)
@app.route('/create_game', methods=['POST'])
def create_game():
    """Mock game creation - just return a fake game hash"""
    import uuid
    return jsonify({
        'game_hash': str(uuid.uuid4()),
        'status': 'success'
    })

# Forward move requests to katago server but adapt response format
@app.route('/botmove', methods=['POST'])
def botmove():
    """Get AI move - adapts katago server response to expected format"""
    try:
        data = request.json
        board_size = data.get('board_size', 19)
        moves = data.get('moves', [])
        
        print(f"DEBUG: Botmove request - board_size: {board_size}, moves: {moves}")
        
        # Forward to katago server
        katago_url = f"{KATAGO_SERVER}/select-move/katago_gtp_bot"
        payload = {
            "board_size": board_size,
            "moves": moves
        }
        
        response = requests.post(katago_url, json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            print(f"DEBUG: Katago response: {result}")
            
            # Adapt response format to what original UI expects
            adapted_response = {
                'bot_move': result.get('bot_move', ''),
                'diagnostics': result.get('diagnostics', {}),
                'status': 'success'
            }
            
            return jsonify(adapted_response)
        else:
            return jsonify({"error": "Failed to get move from katago server"}), 500
            
    except Exception as e:
        print(f"DEBUG: Exception in botmove: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/score_estimate', methods=['POST'])
def score_estimate():
    """Get position scoring"""
    try:
        data = request.json
        board_size = data.get('board_size', 19)
        moves = data.get('moves', [])
        
        # Forward to katago server
        katago_url = f"{KATAGO_SERVER}/score/katago_gtp_bot"
        payload = {
            "board_size": board_size,
            "moves": moves
        }
        
        response = requests.post(katago_url, json=payload, timeout=60)
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Failed to get score from katago server"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Serve favicon
@app.route('/favicon.ico')
def favicon():
    return app.send_static_file('favicon.ico')

if __name__ == '__main__':
    print("Starting KataGo GUI with original interface...")
    print("Server will run on: http://localhost:8000")
    print("Using KataGo server at:", KATAGO_SERVER)
    app.run(host='0.0.0.0', port=8000, debug=True)