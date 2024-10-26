// src/App.js

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
import Admin from './Admin';
import Game from './Game'; // Import the Game component
import './App.css';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/game" element={<Game />} /> {/* Route for Game */}
                {/* Add more routes as needed */}
            </Routes>
        </Router>
    );
}

export default App;
