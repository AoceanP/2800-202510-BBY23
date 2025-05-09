require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { MongoClient } = require('mongodb');
const path = require('path');
const bcrypt = require('bcrypt');
const joi = require('joi');

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 12;

// Load URI from .env
const mongoURI = process.env.MONGO_URI;

// Serve static files from "frontend" folder
app.use(express.static(path.join(__dirname, 'public')))
app.use("/img", express.static(path.join(__dirname + "/public/img")));
app.use("/css", express.static(path.join(__dirname + "/public/css")));
app.use("/js", express.static(path.join(__dirname + "/public/js")));

const mongoStore = MongoStore.create({
    mongoUrl: mongoURI
});

const client = new MongoClient(mongoURI);
client.connect();
const db = client.db("travelplanner");
const users = db.collection("users");

app.use(session({
    resave: false,
    saveUninitialized: true,
    store: mongoStore,
    secret: process.env.SESSION_SECRET
}));
app.use(express.urlencoded({ extended: true }));

// Default route - send index.html if user visits "/"
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect("/planner");
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect("/planner");
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
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
        users.findOne({ email: req.body.email }).then(user => {
            console.log(user);
            if (!user) {
                res.redirect("/signup");
            } else if (bcrypt.compareSync(req.body.password, user.password)) {
                user.password = "";
                req.session.user = user;
                res.redirect("/planner");
            }
        });
    }
});

app.get("/planner", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'home.html'))
    } else {
        res.redirect("/");
    }
});

app.get('/signup', (req, res) => {
    if (req.session.user) {
        res.redirect("/planner");
    } else {
        res.sendFile(path.join(__dirname, 'public', 'signup.html'));
    }
});

app.post('/signupUser', async (req, res) => {
    const schema = joi.object({
        email: joi.string().required().email(),
        username: joi.string().required(),
        name: joi.string().required(),
        password: joi.string().required().min(5).max(20),
        password2: joi.string().required().min(5).max(20)
    });
    let query = schema.validate(req.body);
    if (query.error) {
        res.redirect("/signup");
    } else {
        
        if (await users.findOne({ email: req.body.email })) {
            res.redirect("/login");
        } else {
            let newUser = {
                email: req.body.email,
                username: req.body.username,
                name: req.body.name,
                password: await bcrypt.hash(req.body.password, saltRounds)
            };
            await users.insertOne(newUser);
            newUser.password = "";
            req.session.user = newUser;
            res.redirect("/planner");
        }
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
