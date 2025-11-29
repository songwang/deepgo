#!/usr/bin/env python

# Minimal version of original katagui - strips out database but keeps UI structure
import os, json, random
import requests
from flask import Flask, render_template, jsonify, request, session, url_for, redirect

app = Flask(__name__)
app.config.update(
    DEBUG = True,
    SECRET_KEY = 'simple_secret_key'
)

KATAGO_SERVER = 'http://localhost:2718'

# Mock current_user object
class MockUser:
    def __init__(self):
        self.data = {'username': 'Guest'}
        self.is_authenticated = False

current_user = MockUser()

# Import the real translation system
try:
    from translations import translate as real_translate, _langdict
    HAS_TRANSLATIONS = True
except ImportError:
    HAS_TRANSLATIONS = False
    def real_translate(key):
        return key

def translate(key):
    if not HAS_TRANSLATIONS:
        return key
    
    # Get current language from session, default to English
    lang = session.get('language', 'eng')
    return real_translate(key, lang)

def logged_in():
    return True  # Enable self-play and other logged-in features for guest users

def rrand():
    return str(random.uniform(0,1))

def is_mobile():
    return session.get('is_mobile', False)

def donation_blurb(*args, **kwargs):
    return ""  # Accept any arguments but return empty string

@app.context_processor
def inject_template_funcs():
    return {
        'tr': translate,
        'logged_in': logged_in,
        'rrand': rrand,
        'is_mobile': is_mobile,
        'donation_blurb': donation_blurb,
        'current_user': current_user,
        'url_for': url_for  # Make url_for available in templates
    }

# Enable self-play by making the app think we're logged in for JavaScript
@app.route('/get_logged_in_status')
def get_logged_in_status():
    """Return logged in status for JavaScript - enable self-play in guest mode"""
    return jsonify({'logged_in': True})  # Always return true to enable self-play

# Basic routes that templates expect
@app.route('/login')
def login():
    return "Login not implemented in simplified version"

@app.route('/register')  
def register():
    return "Registration not implemented in simplified version"

@app.route('/logout')
def logout():
    return "Logout not implemented in simplified version"

@app.route('/about')
def about():
    return render_template('about.tmpl')

@app.route('/account')
def account():
    return "Account management not implemented in simplified version"

@app.route('/find_game')
def find_game():
    return "Game search not implemented in simplified version"

@app.route('/korean')
def korean():
    session['language'] = 'kor'
    return redirect(request.referrer or url_for('index'))

@app.route('/chinese')  
def chinese():
    session['language'] = 'chinese'
    return redirect(request.referrer or url_for('index'))

@app.route('/japanese')
def japanese():
    session['language'] = 'japanese' 
    return redirect(request.referrer or url_for('index'))

@app.route('/english')
def english():
    session['language'] = 'eng'
    return redirect(request.referrer or url_for('index'))

# Main routes
@app.route('/')
@app.route('/index')
@app.route('/home')
def index():
    return render_template('index.tmpl', home=True, enable_selfplay=True)

@app.route('/index_mobile')
def index_mobile():
    session['is_mobile'] = True
    return render_template('index_mobile.tmpl', home=True)

@app.route('/create_game', methods=['POST'])
def create_game():
    import uuid
    return jsonify({
        'game_hash': str(uuid.uuid4()),
        'status': 'success'
    })

# Generic botmove handler for all endpoint variants
def handle_botmove():
    try:
        data = request.json
        board_size = data.get('board_size', 19)
        moves = data.get('moves', [])
        
        print(f"DEBUG: Botmove request - endpoint: {request.endpoint}, board_size: {board_size}, moves: {moves}")
        
        katago_url = f"{KATAGO_SERVER}/select-move/katago_gtp_bot"
        payload = {"board_size": board_size, "moves": moves}
        
        response = requests.post(katago_url, json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            print(f"DEBUG: Katago response: {result}")
            
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

# All the select-move endpoints that original UI expects
@app.route('/select-move-guest/<bot_name>', methods=['POST'])
def select_move_guest(bot_name):
    return handle_botmove()

@app.route('/select-move/<bot_name>', methods=['POST'])
def select_move(bot_name):
    return handle_botmove()

@app.route('/select-move-x/<bot_name>', methods=['POST'])
def select_move_x(bot_name):
    return handle_botmove()

@app.route('/select-move-one10/<bot_name>', methods=['POST'])
def select_move_one10(bot_name):
    return handle_botmove()

@app.route('/select-move-marfa-strong/<bot_name>', methods=['POST'])
def select_move_marfa_strong(bot_name):
    return handle_botmove()

@app.route('/select-move-marfa-xstrong/<bot_name>', methods=['POST'])
def select_move_marfa_xstrong(bot_name):
    return handle_botmove()

# Keep original botmove for backwards compatibility
@app.route('/botmove', methods=['POST'])
def botmove():
    return handle_botmove()

@app.route('/favicon.ico')
def favicon():
    return app.send_static_file('favicon.ico')

if __name__ == '__main__':
    print("Starting minimal KataGo GUI with original interface...")
    print("Server will run on: http://localhost:8000")
    print("Using KataGo server at:", KATAGO_SERVER)
    app.run(host='0.0.0.0', port=8000, debug=True)