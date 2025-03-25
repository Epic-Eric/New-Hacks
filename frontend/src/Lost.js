import React, { useState, useEffect } from 'react';
import './Loading.css';
import './Lost.css';
import socket from './socket';

const Lost = () => {
    const [gameStatistics, setGameStatistics] = useState(null);
    const emojis = ['😀', '😎', '🤠', '🤓', '🤩', '🤪', '😺', '🤡', '👻', '👽'];

    useEffect(() => {
        // Listen for gameOver event from the server
        socket.on("gameOver", (data) => {
            console.log("Game over, received statistics:", data.statistics);
            setGameStatistics(data.statistics);
        });

        return () => {
            socket.off("gameOver");
        };
    }, []);

    // Find the maximum survival time for creating the timeline
    const getMaxSurvivalTime = () => {
        if (!gameStatistics) return 0;
        const times = Object.values(gameStatistics).filter(time => typeof time === 'number');
        return times.length > 0 ? Math.max(...times) + 5 : 30; // Add 5 seconds extra space
    };

    // Render the results timeline
    const renderTimeline = () => {
        if (!gameStatistics) return null;

        const maxTime = getMaxSurvivalTime();
        const players = Object.keys(gameStatistics).filter(
            player => typeof gameStatistics[player] === 'number'
        );

        return (
            <div className="game-results">
                <h2>Game Results</h2>
                <div className="timeline-container">
                    <div className="timeline">
                        {/* Timeline bar */}
                        <div className="timeline-bar">
                            {/* Time markers */}
                            {Array.from({ length: Math.ceil(maxTime / 5) + 1 }, (_, i) => i * 5).map(time => (
                                <div 
                                    key={`time-${time}`} 
                                    className="time-marker"
                                    style={{ left: `${(time / maxTime) * 100}%` }}
                                >
                                    <div className="marker-line"></div>
                                    {time}s
                                </div>
                            ))}

                            {/* Player markers */}
                            {players.map((player, index) => {
                                const survivalTime = gameStatistics[player];
                                const position = (survivalTime / maxTime) * 100;
                                
                                return (
                                    <div 
                                        key={player}
                                        className="player-marker"
                                        style={{
                                            left: `${position}%`,
                                            '--index': index
                                        }}
                                    >
                                        <div className="player-name">
                                            {player}
                                        </div>
                                        <div className="player-emoji">
                                            {emojis[index % emojis.length]}
                                        </div>
                                        <div className="survival-time">
                                            {survivalTime.toFixed(1)}s
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="lost-container">
            <h1 className="lost-message">You Krackled!</h1>
            <span className="lost-emoji">😄</span>
            
            {gameStatistics ? (
                renderTimeline()
            ) : (
                <p className="waiting-message">Waiting for other players to finish...</p>
            )}
        </div>
    );
};

export default Lost;