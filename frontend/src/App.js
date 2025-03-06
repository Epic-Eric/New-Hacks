// src/App.js

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import io from 'socket.io-client';
import Home from './Home';
import Admin from './Admin';
import Game from './Game'; // Import the Game component
import Lost from './Lost';
import './App.css';

const socket = io('https://www.krackle.co'); // Connect to the WebSocket server

function App() {

    return (

        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/game" element={<Game />} /> {/* Route for Game */}
                <Route path="/lost" element={<Lost />} />

            </Routes>
        </Router>

    );
}

export default App;