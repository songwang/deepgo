# DeepGo Local Setup Work Notes

This document explains how to set up a local version of katagui (Go game interface) with katago-server (AI backend) on Windows, without PostgreSQL and Redis dependencies.

## 1. How to Make KataGo Server Run on Windows

### Issue
The original `katago_server.py` was designed for Linux and tried to execute `./katago` which doesn't exist on Windows.

### Solution
Created `katago_server_windows.py` that:

**Key Changes:**
- Uses `katago` from system PATH instead of `./katago` binary
- Uses the included 10-block model: `g170e-b10c128-s1141046784-d204142634.bin.gz`  
- Uses CPU-only config: `gtp_ahn_eigen.cfg`
- Runs on port 2718 (same as original)

**Prerequisites:**
- Install KataGo for Windows and add to system PATH
- Verify with: `katago --help`

**Minimal Dependencies:**
Created `simple_requirements.txt` with only:
```
Flask==3.0.3
gunicorn==22.0.0
```

**To Run:**
```bash
cd C:\test\deepgo\katago-server
pip install --user -r simple_requirements.txt
python katago_server_windows.py
```

## 2. Pointing Frontend to Local Server Instead of Demo Server

### Original Configuration
The original katagui was hardcoded to use demo servers like `https://my-katago-server.herokuapp.com`.

### Changes Made

**In `simple_app_minimal.py`:**
```python
# Changed from demo server to local
KATAGO_SERVER = 'http://localhost:2718'
```

**API Endpoint Mapping:**
The original UI calls different endpoints based on strength setting:
- Guest mode: `/select-move-guest/katago_gtp_bot`
- Strong mode: `/select-move-x/katago_gtp_bot`  
- Fast mode: `/select-move/katago_gtp_bot`

**Solution:** Created a generic handler that maps all these endpoints to the same local katago server:

```python
def handle_botmove():
    # Generic handler that forwards all requests to local katago server
    katago_url = f"{KATAGO_SERVER}/select-move/katago_gtp_bot"
    
@app.route('/select-move-guest/<bot_name>', methods=['POST'])
@app.route('/select-move/<bot_name>', methods=['POST']) 
@app.route('/select-move-x/<bot_name>', methods=['POST'])
# ... all map to handle_botmove()
```

## 3. Removing PostgreSQL and Redis Dependencies

### Original Dependencies
The original katagui required:
- PostgreSQL for user accounts, game storage, move history
- Redis for real-time WebSocket communication (game watching)
- Complex authentication system
- Database models for users, games, moves

### Approach: Template Preservation vs. Clean Rewrite

**Initially tried:** Simple rewrite with basic HTML/Canvas Go board
**Problem:** Lost the beautiful original UI design

**Final approach:** Preserve original templates but mock all dependencies

### Key Changes Made

#### 3.1 Simplified Flask App Structure

**File: `simple_app_minimal.py`**

**Mock Functions for Templates:**
```python
# Mock all template functions that original expects
def translate(key):
    # Simple translation dictionary instead of database lookup
    
def logged_in():
    return False  # Always guest mode
    
def donation_blurb(*args, **kwargs):
    return ""  # Accept any arguments, return empty
    
class MockUser:
    def __init__(self):
        self.data = {'username': 'Guest'}
        self.is_authenticated = False

current_user = MockUser()
```

**Template Context:**
```python
@app.context_processor
def inject_template_funcs():
    return {
        'tr': translate,
        'logged_in': logged_in, 
        'current_user': current_user,
        'url_for': url_for  # Make Flask's url_for available
    }
```

#### 3.2 Route Stubs for Template Links

**Problem:** Original templates have links like `{{ url_for('login') }}` that would crash if routes don't exist.

**Solution:** Create stub routes for all expected endpoints:
```python
@app.route('/login')
def login():
    return "Login not implemented in simplified version"

@app.route('/register')  
def register():
    return "Registration not implemented in simplified version"

# ... similar for all template-referenced routes
```

#### 3.3 Game State Management

**Original:** Complex database storage of game state, move sequences, user sessions

**Simplified:** Stateless gameplay
- No game persistence - each session is independent
- Mock game creation: `return jsonify({'game_hash': str(uuid.uuid4())})`
- No user accounts - everyone plays as guest
- No game watching/observer features

#### 3.4 API Response Format Adaptation

**Issue:** Original JavaScript expected specific response format from katago server.

**Example Response Format:**
```json
{
    "bot_move": "D4",
    "diagnostics": {
        "winprob": 0.452,
        "score": -1.3,
        "best_ten": [...]
    }
}
```

**Solution:** Forward katago server response as-is since it already matches expected format.

## 4. Final Working Architecture

```
Browser (Original UI)
    ↓ (JavaScript calls /select-move-guest/katago_gtp_bot)
simple_app_minimal.py 
    ↓ (forwards to http://localhost:2718/select-move/katago_gtp_bot)  
katago_server_windows.py
    ↓ (calls katago binary via GTP)
KataGo (Windows binary from PATH)
```

## 5. Files Created/Modified

**New Files:**
- `katago-server/katago_server_windows.py` - Windows-compatible katago server
- `katago-server/simple_requirements.txt` - Minimal dependencies  
- `katagui/simple_app_minimal.py` - Simplified Flask app with original UI
- `katagui/simple_requirements.txt` - Frontend dependencies

**Copied/Used:**
- `katagui/templates/` - Original katagui templates (copied from katago_gui/templates/)
- `katagui/static/` - Original CSS, JavaScript, images (copied from katago_gui/static/)

## 6. How to Run Complete Setup

**Terminal 1 - KataGo Server:**
```bash
cd C:\test\deepgo\katago-server
python katago_server_windows.py
# Should show: Server will run on: http://localhost:2718
```

**Terminal 2 - Game Frontend:**
```bash
cd C:\test\deepgo\katagui  
python simple_app_minimal.py
# Should show: Server will run on: http://localhost:8000
```

**Browser:**
- Open `http://localhost:8000`
- Click "New Game" 
- Click on board to place stones
- AI responds automatically

## 7. What Works vs. What Doesn't

**✅ Working:**
- Beautiful original katagui UI design
- Full Go gameplay (19x19 board)
- AI move generation via local KataGo
- Game controls (pass, undo, new game)
- Board position scoring
- Handicap and komi settings
- Mobile-responsive design

**❌ Not Working (by design):**
- User registration/login
- Game saving/loading  
- Watching other players' games
- Chat functionality
- Game search/history
- Email features
- Advanced user settings

## 8. Key Lessons Learned

1. **Preserving UI is harder than expected** - Original templates have many interdependencies
2. **Mock functions must handle flexible arguments** - Use `*args, **kwargs` for template functions
3. **API endpoint compatibility is crucial** - Frontend JavaScript expects specific URL patterns
4. **Stateless can be simpler** - Removing database complexity made the system much lighter
5. **Windows binary paths matter** - Use system PATH instead of relative paths for cross-platform compatibility

This setup provides 95% of the original katagui experience with 5% of the complexity!