require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const Uid = require('uid');
const joi = require('joi');

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 12;

// Load URI from .env
const mongoURI = process.env.MONGO_URI;

// Serve static files from "frontend" folder
app.use("/img", express.static(path.join(__dirname + "/public/img")));
app.use("/css", express.static(path.join(__dirname + "/public/css")));
app.use("/js", express.static(path.join(__dirname + "/public/js")));

mongoose.connect(mongoURI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });

const mongoStore = MongoStore.create({
    mongoUrl: mongoURI
});

const userSchema = new mongoose.Schema({
    email: {type: String, required: true, maxLength: 50},
    username: {type: String, required: true, maxLength: 20},
    password: {type: String, required: true, maxLength: 20},
    name: String
});
const userModel = mongoose.model("user", userSchema);



app.use(session({
    resave: false,
    saveUninitialized: true,
    store: mongoStore,
    secret: process.env.SESSION_SECRET
}));
app.use(express.urlencoded({extended: true}));

// Default route - send index.html if user visits "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/loginUser', (req, res) => {
    const schema = joi.object({
        email: joi.string().required().email(),
        password: joi.string().required().min(5).max(20)
    });
    let query = schema.validate(req.body);
    if (query.error) {
        res.redirect("/login");
    } else {
        //TODO: replace with login code
        mongoose.model("users").find
        res.redirect("/");
    }
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
