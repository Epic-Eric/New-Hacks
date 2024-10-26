import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

const emojis = ['😀', '😆', '😅', '😂', '🤣', '😊', '😍', '😎', '🤩', '🥳', '😜', '🤪']; // Emojis for each player

const Admin = () => {
    const [timer, setTimer] = useState(10); // Default timer value
    const [rounds, setRounds] = useState(3); // Default rounds value
    const [players, setPlayers] = useState(['Player 1', 'Player 2']); // Default players list
    const navigate = useNavigate();

    const handleStartGame = () => {
        navigate('/game', { state: { timer: parseInt(timer), rounds: parseInt(rounds), players } });
    };

    const handleCopyLink = () => {
        const inviteLink = "https://yourgame.com/invite";
        navigator.clipboard.writeText(inviteLink);
        alert("Invite link copied to clipboard!");
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="admin-container">
            <h1>Game Settings</h1>
            <div className="admin-content">
                {/* Player List on the Left */}
                <div className="player-list">
                    <h2>Players</h2>
                    <div className="player-icons">
                        {players.map((player, index) => (
                            <div key={index} className="player-box">
                                <span className="player-emoji">{emojis[index % emojis.length]}</span>
                                <span className="player-name">{player}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Settings and Controls on the Right */}
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
                        Add Players:
                        <input
                            type="text"
                            placeholder="Separate player names with commas"
                            value={players.join(', ')}
                            onChange={(e) => setPlayers(e.target.value.split(', '))}
                        />
                    </label>
                    <button className="start-game-button" onClick={handleStartGame}>
                        Start Game
                    </button>
                    <button className="invite-button" onClick={handleCopyLink}>
                        Invite
                    </button>
                    <button className="home-button" onClick={handleGoHome}>
                        Go Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Admin;
