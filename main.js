require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Load URI from .env
const mongoURI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(mongoURI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        //console.error('Error connecting to MongoDB:', err);
    });

// Serve static files from "frontend" folder
app.use("/img", express.static(path.join(__dirname + "/public/img")));
app.use("/css", express.static(path.join(__dirname + "/public/css")));
app.use("/js", express.static(path.join(__dirname + "/public/js")));

// Default route - send index.html if user visits "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
