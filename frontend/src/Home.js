import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './Home.css'; // Ensure to import your styles

const Home = ({ startGame }) => {
    const [playerName, setPlayerName] = React.useState('');
    const navigate = useNavigate(); // Initialize useNavigate

    const handleStart = () => {
        if (playerName) {
            startGame(playerName);
        }
    };

    const handleCreateGame = () => {
        // Redirect to the /admin page
        navigate('/admin');
    };

    return (
        <div className="home-container">
            <h1 className="game-title">crackle.io</h1>
            <div className="avatar-selection">
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
