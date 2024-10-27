// // src/Loading.js

// import React, { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import socket from './socket';
// import './Loading.css';

// const Loading = () => {
//     const navigate = useNavigate();

//     useEffect(() => {
//         // Listen for the gameStarted event
//         socket.on('gameStarted', (gameSettings) => {
//             console.log("Received 'gameStarted' event in Loading component:", gameSettings);
//             navigate('/game', { state: { ...gameSettings } });
//         });

//         // Clean up the event listener on unmount
//         return () => {
//             socket.off('gameStarted');
//         };
//     }, [navigate]);

//     return (
//         <div className="loading-container">
//             <p>Waiting for Admin...</p>
//             <span className="loading-emoji">😄</span>
//         </div>
//     );
// };

// export default Loading;







import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from './socket';
import './Loading.css';

const Loading = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Listen for the gameStarted event from the server
        socket.on('gameStarted', (gameSettings) => {
            console.log("Received 'gameStarted' event in Loading component:", gameSettings);

            // Ensure gameSettings are valid before navigating
            if (gameSettings && gameSettings.timer && gameSettings.rounds && gameSettings.players) {
                console.log("Navigating to game screen with settings:", gameSettings);
                navigate('/game', { state: { ...gameSettings } });
            } else {
                console.error("Invalid game settings received:", gameSettings);
            }
        });

        // Clean up the event listener on unmount
        return () => {
            console.log("Cleaning up 'gameStarted' listener");
            socket.off('gameStarted');
        };
    }, [navigate]);

    return (
        <div className="loading-container">
            <p>Waiting for Admin to Start the Game...</p>
            <span className="loading-emoji">😄</span>
        </div>
    );
};

export default Loading;
