const express = require('express');
const axios = require('axios');
require('dotenv').config();
const app = express();

app.use(express.static('public'));
app.use(express.json());

const API_KEY = process.env.WEATHER_API_KEY;
console.log('API Key:', API_KEY);

app.get('/weather', async (req, res) => {
    const { lat, lon } = req.query;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    
    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.log('Error fetching weather:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

app.listen(8000, () => console.log('Server running on port 8000'));