const statusElement = document.getElementById('status');
const socket = io();

let playerId = null;
let gameStarted = false;
let endTime = null;
let startTime;

window.addEventListener('keydown', (event) => {
  if (event.key === 'q' && gameStarted && endTime === null) {
    endTime = (Date.now() - startTime) / 1000;
    statusElement.innerText = `You ended the round at ${endTime.toFixed(2)} seconds.`;
    socket.emit('player_ended_round', { end_time: endTime });
  }
});

// Receive player ID from server
socket.on('player_id', (data) => {
  playerId = data.player_id;
});

// Listen for game start
socket.on('start_game', (data) => {
  statusElement.innerText = 'Game started! Press "Q" to end your round.';
  startTime = Date.now();
  gameStarted = true;
  endTime = null;
});

// Listen for round ended event
socket.on('round_ended', (data) => {
  if (endTime === null) {
    endTime = data.end_time;
    statusElement.innerText = `Round ended for you at ${endTime.toFixed(2)} seconds.`;
  }
  gameStarted = false;
});

// Listen for round results
socket.on('round_results', (data) => {
  const players = data.players;
  let resultText = 'Round over! Results:\n';
  for (const id in players) {
    const player = players[id];
    const playerName = id === playerId ? 'You' : `Player ${id}`;
    if (player.end_time !== null) {
      resultText += `${playerName}: Ended round at ${player.end_time.toFixed(2)} seconds.\n`;
    } else {
      resultText += `${playerName}: Did not end the round.\n`;
    }
  }
  alert(resultText);
  statusElement.innerText = 'Waiting for the next round...';
});

window.onload = function() {
  // Notify server that player is ready
  socket.emit('player_ready');
};