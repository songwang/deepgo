#!/usr/bin/env python

# Simple version of katagui without PostgreSQL and Redis dependencies
# Just handles game play and calls katago server

import os, json, random
import requests
from flask import Flask, render_template, jsonify, request, session

app = Flask(__name__)
app.config.update(
    DEBUG = True,
    SECRET_KEY = 'simple_secret_key'
)

# KataGo server URL - you can change this to point to your local katago-server
KATAGO_SERVER = 'http://localhost:2718'

@app.route('/')
@app.route('/index')
@app.route('/home')
def index():
    """Main entry point - simple Go board"""
    return render_template('simple_index.html')

@app.route('/get_move', methods=['POST'])
def get_move():
    """Get AI move from katago server"""
    try:
        data = request.json
        board_size = data.get('board_size', 19)
        moves = data.get('moves', [])
        
        print(f"DEBUG: Received request - board_size: {board_size}, moves: {moves}")
        
        # Forward request to katago server
        katago_url = f"{KATAGO_SERVER}/select-move/katago_gtp_bot"
        payload = {
            "board_size": board_size,
            "moves": moves
        }
        
        print(f"DEBUG: Sending request to {katago_url}")
        print(f"DEBUG: Payload: {payload}")
        
        response = requests.post(katago_url, json=payload, timeout=60)
        
        print(f"DEBUG: Got response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"DEBUG: Response data: {result}")
            return jsonify(result)
        else:
            print(f"DEBUG: Error response: {response.text}")
            return jsonify({"error": "Failed to get move from katago server"}), 500
            
    except Exception as e:
        print(f"DEBUG: Exception occurred: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/get_score', methods=['POST'])
def get_score():
    """Get position scoring from katago server"""
    try:
        data = request.json
        board_size = data.get('board_size', 19)
        moves = data.get('moves', [])
        
        # Forward request to katago server
        katago_url = f"{KATAGO_SERVER}/score/katago_gtp_bot"
        payload = {
            "board_size": board_size,
            "moves": moves
        }
        
        response = requests.post(katago_url, json=payload, timeout=30)
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Failed to get score from katago server"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)