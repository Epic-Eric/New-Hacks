import React, { useState } from 'react';
import './Admin.css'; // Import the CSS for styling

const Admin = () => {
    const [timer, setTimer] = useState(10); // Default timer value
    const [rounds, setRounds] = useState(3); // Default rounds value
    const [players, setPlayers] = useState(2); // Default player count

    const handleStartGame = () => {
        console.log("Starting game with settings:", { timer, rounds, players });
        // Logic to start the game
    };

    const handleCopyLink = () => {
        const inviteLink = "https://yourgame.com/invite"; // Replace with your actual invite link
        navigator.clipboard.writeText(inviteLink);
        alert("Invite link copied to clipboard!");
    };

    return (
        <div className="admin-container">
            <h1>Game Settings</h1>
            <div className="settings">
                <label>
                    Timer:
                    <input
                        type="number"
                        value={timer}
                        onChange={(e) => setTimer(e.target.value)}
                        min="1"
                    />
                </label>
                <label>
                    Rounds:
                    <input
                        type="number"
                        value={rounds}
                        onChange={(e) => setRounds(e.target.value)}
                        min="1"
                    />
                </label>
                <label>
                    Players:
                    <input
                        type="number"
                        value={players}
                        onChange={(e) => setPlayers(e.target.value)}
                        min="1"
                    />
                </label>
            </div>
            <button className="start-game-button" onClick={handleStartGame}>
                Start Game
            </button>
            <button className="invite-button" onClick={handleCopyLink}>
                Invite
            </button>
        </div>
    );
};

export default Admin;
