import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './Home';
import Admin from './Admin';

function App() {
    const [isGameStarted, setIsGameStarted] = useState(false);

    // Define the startGame function
    const startGame = () => {
        setIsGameStarted(true);
    };

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home startGame={startGame} />} />
                <Route path="/admin" element={<Admin />} />
            </Routes>
        </Router>
    );
}

export default App;
