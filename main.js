require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const Amadeus = require('amadeus');
const path = require('path');
const bcrypt = require('bcrypt');
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
app.use(bodyParser.json());
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
}));

// Initialize Amadeus API client
const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

app.get("/airport-search/:parameter", (req, res) => {
    if (!req.session.user) {
        res.status(401).send("Unauthorized");
        return;
    }
    amadeus.referenceData.locations.get({
        keyword: req.params.parameter,
        subType: Amadeus.location.any
    }).then(response => {
        res.send(response.result);
    }).catch(err => {
        console.error(err);
        res.status(500).send("Error fetching data from Amadeus API");
    });
});

app.get("/flight-search", (req, res) => {
    if (!req.session.user) {
        res.status(401).send("Unauthorized");
        return;
    }
    const originCode = req.query.originCode;
    const destinationCode = req.query.destinationCode;
    const departureDate = req.query.departureDate;
    amadeus.shopping.flightOffersSearch.get({
        originLocationCode: originCode,
        destinationLocationCode: destinationCode,
        departureDate: departureDate,
        adults: 1,
        max: '7',
        currencyCode: "CAD"
    }).then(response => {
        res.send(response.result);
    }).catch(err => {
        console.error(err);
        res.status(500).send("Error fetching data from Amadeus API");
    });
});

app.post("/flight-confirmation", (req, res) => {
    if (!req.session.user) {
        res.status(401).send("Unauthorized");
        return;
    }
    const flight = req.body.flight;
    amadeus.shopping.flightOffers.pricing.post(
        JSON.stringify({
            'data': {
                'type': 'flight-offers-pricing',
                'flightOffers': [flight],
            }
        })
    ).then(response => {
        res.send(response.result);
    }).catch(err => {
        res.send(err);
    });
});

app.post("/flight-booking", (req, res) => {
    if (!req.session.user) {
        res.status(401).send("Unauthorized");
        return;
    }
    const flight = req.body.flight;
    const documents = req.body.documents;
    amadeus.booking.flightOrders.post(
        JSON.stringify({
            'data': {
                'type': 'flight-order',
                'flightOffers': [flight],
                'travelers': [{
                    "id": "1",
                    "dateOfBirth": "1982-01-16",
                    "name": req.session.user.name,
                    "contact": {
                        "emailAddress": req.session.user.email,
                        "phones": [{
                            "deviceType": "MOBILE",
                            "countryCallingCode": "34",
                            "number": "480080076"
                        }]
                    },
                    "documents": documents
                }]
            }
        })
    ).then(response => {
        res.send(response.result);
    }).catch(err => {
        res.send(err);
    });
});
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
        res.sendFile(path.join(__dirname, 'public', 'planner.html'));
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
