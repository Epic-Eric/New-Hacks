import os 
import socketio
import secrets
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
from supabase import create_client, Client
from pytube import Search
import random

# Initialize FastAPI and Socket.IO
app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi', 
                           cors_allowed_origins='*')

# Mount the Socket.IO server to FastAPI
app.mount("/socket.io", socketio.ASGIApp(sio))

app.add_middleware(
    CORSMiddleware,
    allow_origins='*',
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# In-memory storage for lobbies
DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_KEY = os.getenv("DATABASE_KEY")
supabase: Client = create_client(DATABASE_URL, DATABASE_KEY)


# Root route for checking the server
@app.get("/")
async def root():
    return {"message": "Socket.IO Backend is running."}

# Function to fetch YouTube videos
def fetch_youtube_videos(query="funny videos", max_results=5):
    try:
        search = Search(query)
        videos = search.results  # Get all results
        random.shuffle(videos)  # Shuffle the results to make them random
        selected_videos = videos[:max_results]  # Pick the first 'max_results' from the shuffled list
        # Generate embed URLs for each video
        video_links = [f"https://www.youtube.com/embed/{video.video_id}?autoplay=1" for video in selected_videos]
        return video_links
    except Exception as e:
        return {"error": str(e)}
    
def check_game_over(lobby):
    players = supabase.table('players').select().eq('game', lobby).execute()
    players.raise_when_api_error
    round_statistics = {}
    for player in players.data:
        if not player['lost_time']:
            return False
        else:
            round_statistics[player['player_name']] = player['lost_time']
    return round_statistics

@sio.event
async def createGame(sid, gameData):
    
    # Generate a unique game ID
    gameId = secrets.token_hex(4)
    
    player = {"name": gameData['adminName'], "id": sid}
    # lobby['players'].append(player)

    response_creation = supabase.table('lobbies').insert({
        'game_id': gameId,
        'admin_sid': sid,
        'admin_name': gameData['adminName'],
        'timer': gameData['timer'],
        'rounds': gameData['rounds'],
        'max_players': gameData['players'],
        'round_start_time': None,
    }).execute()

    response_join = supabase.table('players').insert({
        'player_id': sid,
        'game': gameId,
        'player_name': gameData['adminName'],
        'lost_time': None
    }).execute()

    response_creation.raise_when_api_error
    response_join.raise_when_api_error

    # creates websocket room for all future emits
    await sio.enter_room(sid, gameId)
    await sio.emit('createGameResponse', {'success': True, 'gameId': gameId}, to=sid)

    # admin joining the game
    await sio.emit('playerJoined', player, room=gameId)
    await sio.emit('joinLobbyResponse', {'success': True, 'lobbyCode': gameId}, to=sid)

@sio.event
async def joinLobby(sid, data):
    lobbyCode = data['lobbyCode']
    playerName = data['playerName']
    
    # lobby = lobbies.get(lobbyCode)
    lobby_info = supabase.table('lobbies').select().eq('game_id', lobbyCode).execute()
    players_info = supabase.table('players').select().eq('game', lobbyCode).execute()

    try:
        lobby_info.raise_when_api_error
        players_info.raise_when_api_error
        lobby_data = lobby_info.data[0]
        players_info = players_info.data
        if len(players_info) < lobby_data['max_players']:
            if not lobby_data['round_start_time']:
                player = {"name": playerName, "id": sid}
                players_names = [player['player_name'] for player in players_info] + [playerName]

                response_join = supabase.table('players').insert({
                    'player_id': sid,
                    'game': lobbyCode,
                    'player_name': playerName,
                    'lost_time': None,
                }).execute()

                response_join.raise_when_api_error
                
                # join player to the room
                await sio.enter_room(sid, lobbyCode)
                await sio.emit('playerJoined', player, room=lobbyCode, to=lobbyCode)

                # Emit successful join to the player
                await sio.emit('joinLobbyResponse', {'success': True, 'lobbyCode': lobbyCode, 'playerList': players_names}, to=sid)
            else:
                await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Game already started, please wait until the game is finished.'}, to=sid)

        else:
            # Lobby full
            await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Lobby is full.'}, to=sid)
        
    
    except Exception as e:
        # Lobby not found
        await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Lobby not found.'}, to=sid)

@sio.event
async def startGame(sid, lobbyCode):

    lobby = supabase.table('lobbies').select().eq('game_id', lobbyCode).execute().data[0]
    players = supabase.table('players').select().eq('game', lobbyCode).execute().data
    if lobby and lobby['admin_sid'] == sid:
        # Emit 'gameStarted' to all players in the lobby
        response = supabase.table('lobbies').update({
            'round_start_time': time.time()
        }).eq('game_id', lobbyCode).execute()

        players_names = [player['player_name'] for player in players]
        settings = {
            'timer': lobby['timer'],
            'rounds': lobby['rounds'],
            'maxPlayers': lobby['max_players']
        }
        await sio.emit('gameStarted', {'gameSettings': settings, 'room': lobbyCode, 'players': players_names}, to=lobbyCode)
    else:
        # Unauthorized or lobby not found
        await sio.emit('startGameResponse', {'success': False, 'message': 'Unauthorized or lobby not found.'}, to=sid)
        # If the disconnected user was the admin, handle lobby closure

@app.get("/fetch_videos")
async def get_videos():
    videos = fetch_youtube_videos()
    if "error" in videos:
        return {"success": False, "error": videos["error"]}
    return {"success": True, "videos": videos}

@app.get("/")
async def root():
    return {"message": "YouTube Video Fetcher is running."}

@sio.event
async def smiled(sid, lobby):
    death_time = time.time()
    lobby_response = supabase.table("lobbies").select("*").eq("game_id", lobby).execute()
    lobby_response.raise_when_api_error
    start_time = lobby_response.data[0]['round_start_time']
    death_time = death_time - start_time
    update_response = supabase.table("players").update({
        "lost_time": death_time
    }).eq("player_id", sid).execute()
    print(death_time)
    update_response.raise_when_api_error
    print(sid)

    await sio.emit('playerSmiled', {'playerId': sid}, room=lobby)
    game_over_info = check_game_over(lobby)
    if game_over_info:
        await sio.emit('gameOver', {'statistics': game_over_info}, room=lobby)


@sio.event
async def disconnect(sid):
    player_response = supabase.table("players").select("*").eq("player_id", sid).execute()
    if not player_response.data:
        return  # Player not found; nothing to do

    player = player_response.data[0]
    game_id = player["game"]

    lobby_response = supabase.table("lobbies").select("*").eq("game_id", game_id).execute()
    if not lobby_response.data:
        return  # Lobby not found; nothing to do

    lobby = lobby_response.data[0]
    if lobby["admin_sid"] == sid:
        supabase.table("lobbies").delete().eq("game_id", game_id).execute()
        await sio.emit('lobbyClosed', {'message': 'Lobby has been closed by the admin.'}, room=game_id)
    else:
        player_response = supabase.table("players").select("*").eq("player_id", sid).execute()
        player = player_response.data[0] if player_response.data else None
        supabase.table("players").delete().eq("player_id", sid).execute()

        if player:
            await sio.emit("playerLeft", player, room=game_id)

    # Leave the Socket.IO room
    await sio.leave_room(sid, game_id)

    game_over_info = check_game_over(lobby)
    if game_over_info:
        await sio.emit('gameOver', {'statistics': game_over_info}, room=lobby)




# Run the FastAPI app
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)  # Running on port 8000, as port 3000 is taken by npm start
