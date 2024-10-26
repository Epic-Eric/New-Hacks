import React from 'react';
import './Home.css'; // Ensure to import your styles

const Home = ({ startGame }) => {
    const [playerName, setPlayerName] = React.useState('');
    const [language, setLanguage] = React.useState('English');

    const handleStart = () => {
        if (playerName) {
            startGame(playerName);
        }
    };

    return (
        <div className="home-container">
            <h1 className="game-title">crackle.io</h1>
            <div className="avatar-selection">
                {/* Sample avatar (you can replace this with actual avatar selection) */}
                <span className="avatar">&#128512;</span>
            </div>
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
            <button className="play-button" onClick={handleStart}>
                Play!
            </button>
            <div className="about-link">
                <a href="/about">About</a>
            </div>
        </div>
    );
};

export default Home;
