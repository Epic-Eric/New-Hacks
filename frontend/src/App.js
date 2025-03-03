// src/App.js

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import io from 'socket.io-client';
import { OpenCvProvider } from 'opencv-react';
import Home from './Home';
import Admin from './Admin';
import Game from './Game'; // Import the Game component
import Lost from './Lost';
import './App.css';

const socket = io('https://www.krackle.co'); // Connect to the WebSocket server

function App() {
    useEffect(() => {
        // Function to request webcam data
        function requestWebcamData() {
            socket.emit('requestWebcamData');
        }

        // Example usage: Request webcam data when a button is clicked
        const button = document.getElementById('requestWebcamButton');
        if (button) {
            button.addEventListener('click', requestWebcamData);
        }

        // Cleanup event listener on component unmount
        return () => {
            if (button) {
                button.removeEventListener('click', requestWebcamData);
            }
        };
    }, []);

    return (
        <OpenCvProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/game" element={<Game />} /> {/* Route for Game */}
                    <Route path="/lost" element={<Lost />} />
                    {/* Add more routes as needed */}
                </Routes>
            </Router>
        </OpenCvProvider>
    );
}

export default App;