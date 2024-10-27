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








// src/Loading.js

import React from 'react';
import './Loading.css';

const Loading = () => {

    // const navigate = useNavigate();
    // socket.on('gameStarted', (gameSettings) => {
    //     console.log("Received 'gameStarted' event:", gameSettings);
    //     setIsLoading(false);
    //     navigate('/game', { state: { ...gameSettings } });
    // });

    return (
        <div className="loading-container">
            <p>Waiting for Admin to Start the Game...</p>
            <span className="loading-emoji">😄</span>
        </div>
    );
};

export default Loading;
