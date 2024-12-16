import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from bcrypt import hashpw, gensalt, checkpw
import json
from sqlalchemy import text


from flask_socketio import SocketIO, join_room, emit

app = Flask(__name__)
CORS(app, origins="*")  # Enable CORS for all origins

socketio = SocketIO(app, cors_allowed_origins="*")

# Configure SQLAlchemy (Ensure that this path is correct for your environment)
app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+mysqlconnector://eeth1:191114056@eeth1.mysql.pythonanywhere-services.com/eeth1$tictactoe'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# User model
class User(db.Model):
    __tablename__ = "users"
    username = db.Column(db.String(50), primary_key=True, unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    wins = db.Column(db.Integer, default=0)  # Tracks number of wins
    losses = db.Column(db.Integer, default=0)  # Tracks number of losses
    ties = db.Column(db.Integer, default=0)  # Tracks number of ties

# GameSession model
class GameSession(db.Model):
    __tablename__ = 'game_sessions'
    id = db.Column(db.Integer, primary_key=True)
    player_x = db.Column(db.String(50), nullable=False)
    player_o = db.Column(db.String(50), nullable=True)  # Player O can be null initially
    game_state = db.Column(db.JSON, nullable=False, default=lambda: [["", "", ""], ["", "", ""], ["", "", ""]])  # Default 3x3 grid
    status = db.Column(db.String(20), nullable=False, default='waiting')  # 'waiting', 'in-progress', or 'completed'
    current_player = db.Column(db.String(1), nullable=False, default="X")  # X or O

    def __repr__(self):
        return f"<GameSession {self.id} - {self.status}>"

# User registration
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    # Check if the username exists
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({"error": "Username already exists."}), 400

    # Hash password
    hashed_password = hashpw(password.encode("utf-8"), gensalt())
    new_user = User(username=username, password=hashed_password.decode("utf-8"))
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully!"}), 201

# User login
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
        return jsonify({"error": "Invalid username or password."}), 401

    return jsonify({"message": "Login successful!"}), 200


@socketio.on('get_sessions')
def get_sessions():
    sessions = GameSession.query.filter_by(status="waiting").all()
    session_data = [{"id": session.id, "player_x": session.player_x} for session in sessions]
    emit('session_list', session_data)

# Create a new game session
@socketio.on('create_session')
def create_session(data):
    username = data.get("username")
    
    if not username:
        emit('error', {"error": "Username is required."})
        return

    new_session = GameSession(player_x=username, status="waiting", current_player="X")
    db.session.add(new_session)
    db.session.commit()
    print (new_session)
    print(new_session.player_x)
    print(new_session.player_o)
    print(new_session.current_player)
    # Emit the updated session list to all clients
    sessions = GameSession.query.filter_by(status="waiting").all()
    session_data = [{"id": session.id, "player_x": session.player_x} for session in sessions]
    emit('session_list', session_data, broadcast=True)

    # Emit the session creation success to the requester
    emit('session_created', {"message": "Game session created successfully!", "session_id": new_session.id})

# Join a game session
@socketio.on('join_session')
def join_session(data):
    session_id = data.get("session_id")
    username = data.get("username")

    if not username:
        emit('error', {"error": "Username is required."})
        return

    session = GameSession.query.filter_by(id=session_id, status="waiting").first()

    if not session:
        emit('error', {"error": "Session not found or already started."})
        return

    # If player_x is already set and is the same as username, skip assigning player_o
    # If player_o is not yet assigned, assign the username to player_o
    if not session.player_o and session.player_x != username:
        session.player_o = username
        session.status = "in-progress"
        db.session.commit()

    # Join the room for broadcasting
    join_room(session_id)  # Join the room associated with the session_id
    print(f"Player {username} joined session {session_id}")  # dbug
    print(f"Clients in session {session_id}: {socketio.server.manager.rooms}")  # List clients in room

    # Emit game_update to all clients in the room
    emit('game_update', {
        'game_state': session.game_state,
        'current_player': session.current_player,
        'player_x': session.player_x,
        'player_o': session.player_o,
        'status': session.status
    }, room=session_id, broadcast=True)  # Broadcast to everyone in the room

    # Emit the updated session list to all clients
    sessions = GameSession.query.filter_by(status="waiting").all()
    session_data = [{"id": session.id, "player_x": session.player_x} for session in sessions]
    emit('session_list', session_data, broadcast=True)

    # Emit the session join success to the requester
    emit('session_joined', {"message": "You joined the session!", "session_id": session.id})










# Get game state for a session
def get_game_state(session_id):
    session = GameSession.query.get(session_id)
    return session.game_state if session else None

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit('ping')



def check_winner(game_state):
    win_conditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  # rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  # columns
        [0, 4, 8], [2, 4, 6]              # diagonals
    ]
    
    # Flatten the 3x3 grid into a 1D list
    flat_game_state = [game_state[i][j] for i in range(3) for j in range(3)]
    
    # Check all winning conditions
    for condition in win_conditions:
        line = [flat_game_state[i] for i in condition]
        if line[0] == line[1] == line[2] and line[0] != '':  # A winner is found
            return line[0]  # Return the winner ('X' or 'O')
    
    # If there's no winner, check if the board is full
    if '' not in flat_game_state:
        return 'tie'  # It's a tie if the board is full with no winner
    
    return None

def update_user_stats(winner, player_x, player_o):
    if winner == "X":
        player_x.wins += 1
        player_o.losses += 1
    elif winner == "O":
        player_o.wins += 1
        player_x.losses += 1
    elif winner == "tie":
        player_x.ties += 1
        player_o.ties += 1

    db.session.commit()  # Commit after updating stats



# WebSocket Event: Make a move
@socketio.on("make_move")
def handle_make_move(data):
    session_id = data["session_id"]
    player = data["player"]
    row = data["row"]
    col = data["col"]

    session = GameSession.query.get(session_id)
    if not session:
        emit("error", {"message": "Session not found"}, room=request.sid)
        return

    if session.status == "completed":
        emit("error", {"message": "Game is already completed"}, room=request.sid)
        return

    game_state = session.game_state

    # Check if it's the player's turn
    if (session.current_player == "X" and player != session.player_x) or (session.current_player == "O" and player != session.player_o):
        emit("error", {"message": "It's not your turn."}, room=request.sid)
        return

    # Check if the cell is already filled
    if game_state[row][col] != "":
        emit("error", {"message": "Invalid move! Cell already filled."}, room=request.sid)
        return

    # Make the move
    game_state[row][col] = "X" if player == session.player_x else "O"
    session.current_player = "O" if session.current_player == "X" else "X"

    try:
        # Update the game state in the database
        update_query = text("""
            UPDATE game_sessions 
            SET game_state = :game_state, current_player = :current_player 
            WHERE id = :session_id
        """)

        db.session.execute(update_query, {
            'game_state': json.dumps(game_state),
            'current_player': session.current_player,
            'session_id': session_id
        })

        db.session.commit()

    except Exception as e:
        db.session.rollback()
        emit("error", {"message": "Error committing move to the database"}, room=request.sid)
        return

    # Check for a winner or a tie
    winner = check_winner(game_state)
    
    if winner == "tie":
        session.status = "completed"
        emit("game_update", {
            "game_state": game_state,
            "current_player": session.current_player,
            "player_x": session.player_x,
            "player_o": session.player_o,
            "status": session.status,
            "winner": winner
        }, room=session_id)

        player_x = User.query.get(session.player_x)
        player_o = User.query.get(session.player_o)

        update_user_stats(winner, player_x, player_o)
        db.session.commit()
    elif winner:
        session.status = "completed"
        emit("game_update", {
            "game_state": game_state,
            "current_player": session.current_player,
            "player_x": session.player_x,
            "player_o": session.player_o,
            "status": session.status,
            "winner": winner
        }, room=session_id)

        player_x = User.query.get(session.player_x)
        player_o = User.query.get(session.player_o)

        update_user_stats(winner, player_x, player_o)
        db.session.commit()
    else:
        # Game is still in progress, emit an update
        emit("game_update", {
            "game_state": game_state,
            "current_player": session.current_player,
            "player_x": session.player_x,
            "player_o": session.player_o,
            "status": session.status,
            "winner": winner
        }, room=session_id)


    # Commit the session status change (if a winner or tie was found)
    try:
        update_status_query = text("""
            UPDATE game_sessions
            SET status = :status
            WHERE id = :session_id
        """)
        db.session.execute(update_status_query, {
            'status': session.status,
            'session_id': session_id
        })
        db.session.commit()
    except Exception as e:
        db.session.rollback()

    print(f"Emitting game_update to room {session_id}: {game_state}")

@app.route('/api/users/<username>', methods=['GET'])
def get_user_stats(username):
    user = User.query.filter_by(username=username).first()
    if user:
        return jsonify({
            'wins': user.wins,
            'losses': user.losses,
            'ties': user.ties
        })
    else:
        return jsonify({'error': 'User not found'}), 404







# Main entry point
if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Create tables if not already created
    socketio.run(app, debug = True)
