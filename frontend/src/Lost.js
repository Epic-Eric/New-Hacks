import React from 'react';
import './Loading.css';

const Lost = () => {

    // const navigate = useNavigate();
    // socket.on('gameStarted', (gameSettings) => {
    //     console.log("Received 'gameStarted' event:", gameSettings);
    //     setIsLoading(false);
    //     navigate('/game', { state: { ...gameSettings } });
    // });

    return (
        <div className="loading-container">
            <p>You Krackled!...</p>
            <span className="loading-emoji">😄</span>
        </div>
    );
};

export default Lost;