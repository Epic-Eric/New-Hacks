from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

players = {}
game_started = False
round_duration = 60  # Duration of the round in seconds

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    player_id = request.sid
    print(f'Player connected: {player_id}')
    players[player_id] = {'end_time': None}
    emit('player_id', {'player_id': player_id})

@socketio.on('disconnect')
def handle_disconnect():
    player_id = request.sid
    print(f'Player disconnected: {player_id}')
    if player_id in players:
        del players[player_id]

@socketio.on('player_ready')
def handle_player_ready():
    global game_started
    if not game_started:
        game_started = True
        game_start_time = time.time()
        print('Game started')
        socketio.emit('start_game', {'start_time': game_start_time})
        # Start a background task to end the round after the specified duration
        socketio.start_background_task(end_round, game_start_time)

@socketio.on('player_ended_round')
def handle_player_ended_round(data):
    player_id = request.sid
    if players.get(player_id) and players[player_id]['end_time'] is None:
        players[player_id]['end_time'] = data['end_time']
        print(f'Player {player_id} ended the round at {data["end_time"]} seconds')
        # Notify the player that their round has ended
        emit('round_ended', {'end_time': data['end_time']})

def end_round(game_start_time):
    global game_started
    # Wait until the round duration has passed
    time.sleep(round_duration - (time.time() - game_start_time))
    game_started = False
    # Send results to all players
    socketio.emit('round_results', {'players': players})
    # Reset players' end times for the next round
    for player in players.values():
        player['end_time'] = None
    print('Round ended, results sent to players')

if __name__ == '__main__':
    socketio.run(app, port = 5000, debug=True)
