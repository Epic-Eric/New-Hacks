import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = ({ startGame }) => {
    const [playerName, setPlayerName] = useState('');
    const navigate = useNavigate();

    const handleStart = () => {
        if (playerName) {
            startGame(playerName);
        }
    };

    const handleCreateGame = () => {
        navigate('/admin');
    };

    return (
        <div className="home-container">
            <h1 className="game-title">crackle.io <span className="emoji">😄</span></h1>
            <div className="name-entry">
                <label className="name-label">
                    Name:
                    <input
                        type="text"
                        className="name-input"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                    />
                </label>
            </div>
            <div className="button-container">
                <button className="play-button" onClick={handleStart}>
                    Play!
                </button>
                <button className="create-game-button" onClick={handleCreateGame}>
                    Create a New Game
                </button>
            </div>
            <div className="about-link">
                <a href="/about">About</a>
            </div>
        </div>
    );
};

export default Home;
