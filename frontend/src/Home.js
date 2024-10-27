// src/Home.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socket from './socket';
import Loading from './Loading';
import './Home.css'; // Ensure this path is correct based on your project structure

const Home = () => {
    const [playerName, setPlayerName] = useState('');
    const [lobbyCode, setLobbyCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const lobby = params.get('lobby');
        if (lobby) {
            setLobbyCode(lobby);
        }

        // Socket event listeners
        socket.on('playerJoined', (player) => {
            console.log(`Joined lobby as ${player.name}`);
        });

        socket.on('lobbyNotFound', () => {
            setError('Lobby not found. Please check the code and try again.');
            setIsLoading(false);
        });

        socket.on('joinLobbyResponse', ({ success, lobbyCode, message }) => {
            if (success) {
                console.log(`Successfully joined lobby: ${lobbyCode}`);
            } else {
                setError(message || 'Failed to join lobby.');
                setIsLoading(false);
            }
        });

        socket.on('gameStarted', (gameSettings) => {
            console.log("Received 'gameStarted' event:", gameSettings);
            setIsLoading(false);
            navigate('/game', { state: { ...gameSettings } });
        });

        // Cleanup listeners
        return () => {
            socket.off('playerJoined');
            socket.off('lobbyNotFound');
            socket.off('joinLobbyResponse');
            socket.off('gameStarted');
        };
    }, [location.search, navigate]);

    const handleStart = () => {
        setError('');
        if (playerName && lobbyCode) {
            console.log("Attempting to join lobby:", lobbyCode);
            socket.emit('joinLobby', { lobbyCode, playerName });
            setIsLoading(true);
        } else {
            setError('Please enter both your name and lobby code.');
        }
    };

    const handleCreateGame = () => {
        navigate('/admin');
    };

    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="home-container">
            <header className="header">
                <h1 className="game-title">krackle.co <span className="emoji">😄</span></h1>
            </header>

            <main className="main-content">
                <section className="form-section">
                    <div className="form-group">
                        <label htmlFor="playerName" className="form-label">Name:</label>
                        <input
                            type="text"
                            id="playerName"
                            className="form-input"
                            placeholder="Enter your name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            aria-label="Player Name"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="lobbyCode" className="form-label">Lobby Code:</label>
                        <input
                            type="text"
                            id="lobbyCode"
                            className="form-input"
                            placeholder="Enter lobby code"
                            value={lobbyCode}
                            onChange={(e) => setLobbyCode(e.target.value)}
                            aria-label="Lobby Code"
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="button-group">
                        <button className="btn btn-primary" onClick={handleStart} aria-label="Play">
                            Play!
                        </button>
                        <button className="btn btn-secondary" onClick={handleCreateGame} aria-label="Create a New Game">
                            Create a New Game
                        </button>
                    </div>
                </section>

                <section className="about-section">
                    <h2>Project for NewHacks 2024</h2>
                    <p>
                        This project was developed for NewHacks 2024, aiming to create an engaging and fun platform for users to compete and enjoy unique challenges.
                    </p>
                    <h3>Our Team</h3>
                    <div className="team-members">
                        <div className="member">
                            <h4>Eric</h4>
                            <p>Lead Developer</p>
                        </div>
                        <div className="member">
                            <h4>Hayson</h4>
                            <p>UI/UX Designer</p>
                        </div>
                        <div className="member">
                            <h4>Jacky</h4>
                            <p>Backend Engineer</p>
                        </div>
                        <div className="member">
                            <h4>Paul</h4>
                            <p>Project Manager</p>
                        </div>
                    </div>
                </section>

                <section className="rules-section">
                    <h2>Rules</h2>
                    <ol className="rules-list">
                        <li>Watch a Funny Reel.</li>
                        <li>Try not to Laugh.</li>
                        <li>Earn Points and Compete with your friends.</li>
                    </ol>
                </section>
            </main>

            <footer className="footer">
                {/* Optional footer content can go here */}
            </footer>
        </div>
    );

};

export default Home;
