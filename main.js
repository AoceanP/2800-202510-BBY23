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
const genai = require('@google/genai');
const Stripe = require('stripe');

const aiBot = new genai.GoogleGenAI({ apiKey: process.env.GENAI_API_KEY });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 12;

// Load URI from .env
const mongoURI = process.env.MONGO_URI;

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));
app.use("/img", express.static(path.join(__dirname, "public/img")));
app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use("/js", express.static(path.join(__dirname, "public/js")));

const mongoStore = MongoStore.create({
    mongoUrl: mongoURI
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

const client = new MongoClient(mongoURI);
const db = client.db("travelplanner");
const users = db.collection("users");
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

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
        max: '5',
        currencyCode: "CAD"
    }).then(response => {
        res.send(response.result);
    }).catch(err => {
        console.error('Flight search error:', err);
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
        console.error('Flight confirmation error:', err);
        res.status(500).send("Error confirming flight");
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
        console.error('Flight booking error:', err);
        res.status(500).send("Error booking flight");
    });
});

// Default route
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
        res.render('login', { error: req.session.error || null });
        req.session.error = null;
    }
});

app.post('/loginUser', async (req, res) => {
    const schema = joi.object({
        email: joi.string().required().email().messages({
            'string.email': 'Email or password doesn\'t match.',
            'any.required': 'Email or password doesn\'t match.'
        }),
        password: joi.string().required().min(5).max(20).messages({
            'string.min': 'Email or password doesn\'t match.',
            'string.max': 'Email or password doesn\'t match.',
            'any.required': 'Email or password doesn\'t match.'
        })
    });
    const { error } = schema.validate(req.body);
    if (error) {
        req.session.error = error.details[0].message;
        return res.redirect("/login");
    }
    try {
        const user = await users.findOne({ email: req.body.email });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            req.session.error = "Email or password doesn't match.";
            return res.redirect("/login");
        }
        user.password = "";
        req.session.user = user;
        res.redirect("/planner");
    } catch (err) {
        console.error('Login error:', err);
        req.session.error = "Server error. Please try again later.";
        res.redirect("/login");
    }
});

app.get("/planner", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'home.html'));
    } else {
        res.redirect("/");
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            res.status(500).send("Error logging out");
        } else {
            res.redirect("/login");
        }
    });
});

app.get('/signup', (req, res) => {
    if (req.session.user) {
        res.redirect("/planner");
    } else {
        res.render('signup', { error: req.session.error || null });
        req.session.error = null;
    }
});

app.post('/signupUser', async (req, res) => {
    const schema = joi.object({
        email: joi.string().required().email().messages({
            'string.email': 'Please enter a valid email.',
            'any.required': 'Email is required.'
        }),
        username: joi.string().required().messages({
            'any.required': 'Username is required.'
        }),
        name: joi.string().required().messages({
            'any.required': 'Name is required.'
        }),
        password: joi.string().required().min(5).max(20).messages({
            'string.min': 'Password must be at least 5 characters.',
            'string.max': 'Password cannot exceed 20 characters.',
            'any.required': 'Password is required.'
        }),
        password2: joi.string().required().min(5).max(20).messages({
            'any.required': 'Confirm password is required.'
        })
    });
    const { error } = schema.validate(req.body);
    if (error) {
        req.session.error = error.details[0].message;
        return res.redirect("/signup");
    }
    if (req.body.password !== req.body.password2) {
        req.session.error = "Passwords do not match.";
        return res.redirect("/signup");
    }
    try {
        const existingUser = await users.findOne({ email: req.body.email });
        if (existingUser) {
            req.session.error = "Email already exists.";
            return res.redirect("/login");
        }
        const newUser = {
            email: req.body.email,
            username: req.body.username,
            name: req.body.name,
            password: await bcrypt.hash(req.body.password, saltRounds)
        };
        await users.insertOne(newUser);
        newUser.password = "";
        req.session.user = newUser;
        res.redirect("/planner");
    } catch (err) {
        console.error('Signup error:', err);
        req.session.error = "Server error. Please try again later.";
        res.redirect("/signup");
    }
});

app.get("/flights", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'flights.html'));
    } else {
        res.redirect("/");
    }
});

app.get("/suggestions", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'suggestions.html'));
    } else {
        res.redirect("/");
    }
});

app.get("/activities", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'activities.html'));
    } else {
        res.redirect("/");
    }
});

app.get("/cars", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'cars.html'));
    } else {
        res.redirect("/");
    }
});

app.get("/packages", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'packages.html'));
    } else {
        res.redirect("/");
    }
});

app.get("/hotels", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'hotels.html'));
    } else {
        res.redirect("/");
    }
});

app.post("/getSuggestions", async (req, res) => {
    if (req.session.user) {
        try {
            const response = await aiBot.models.generateContent({
                contents: `What are some travel suggestions for a budget trip to ${req.body.location}? 
                    Please make it one paragraph long.`,
                model: "gemini-2.5-flash-preview-04-17",
            });
            res.send(response.candidates[0].content.parts[0].text);
        } catch (err) {
            console.error('Suggestions error:', err);
            res.status(500).send("Error fetching suggestions");
        }
    } else {
        res.redirect("/");
    }
});

app.post("/addCartItem", (req, res) => {
    if (req.session.user) {
        const schema = joi.object({
            name: joi.string().required(),
            id: joi.string().required(),
            price: joi.number().required(),
            type: joi.string().required().valid("Flight", "Hotel", "Car", "Activity")
        });
        let query = schema.validate(req.body);
        if (query.error) {
            res.status(400).send("Invalid data");
        } else {
            users.updateOne(
                { email: req.session.user.email },
                { $addToSet: { cart: req.body } }
            ).then(() => {
                res.send("Item added to cart");
            }).catch(err => {
                console.error(err);
                res.status(500).send("Error adding item to cart");
            });
        }
    } else {
        res.redirect("/");
    }
});

app.get("/cart", (req, res) => {
    if (req.session.user) {
        users.findOne({ email: req.session.user.email }).then(user => {
            if (user) {
                res.sendFile(path.join(__dirname, "public", "cart.html"));
            } else {
                res.status(404).send("User not found");
            }
        }).catch(err => {
            console.error(err);
            res.status(500).send("Error fetching user data");
        });
    } else {
        res.redirect("/");
    }
});

app.get("/getCartItems", (req, res) => {
    if (req.session.user) {
        users.findOne({ email: req.session.user.email }).then(user => {
            if (user) {
                res.send(user.cart);
            } else {
                res.status(404).send("User not found");
            }
        }).catch(err => {
            console.error(err);
            res.status(500).send("Error fetching user data");
        });
    } else {
        res.redirect("/");
    }
});

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // Handle the event
    switch (event.type) {
        case "checkout.session.completed":
            const session = event.data.object;
            console.log("Payment was successful!");
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    res.json({ received: true });
});

app.post("/clearCart", (req, res) => {
    if (req.session.user) {
        users.updateOne(
            { email: req.session.user.email },
            { $set: { cart: [] } }
        ).then(() => {
            console.log("Cart cleared");
            res.send("Cart cleared");
        }).catch(err => {
            console.error(err);
            res.status(500).send("Error clearing cart");
        });
    } else {
        res.redirect("/");
    }
});

app.get("/success", async (req, res) => {
    const sessionId = req.query.session_id;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(session);
    users.updateOne(
        { email: req.session.user.email },
        { $set: { cart: [] } }
    ).then(() => {
        console.log("Cart cleared");
        res.send(`
        <h1>Payment Successful!</h1>
        <p>Session ID: ${sessionId}</p>
        <a href="/">Go back</a>
    `);
    }).catch(err => {
        console.error(err);
    });

});

app.get("/cancel", (req, res) => {
    res.send(`
        <h1>Payment Cancelled</h1>
        <a href="/">Go back</a>
    `);
});

app.post("/checkout", async (req, res) => {
    console.log("Checkout initiated");
    if (req.session.user) {
        const user = await users.findOne({ email: req.session.user.email });
        if (user) {
            const cartItems = user.cart;
            let checkoutItems = [];
            for (let item of cartItems) {
                let product = await stripe.products.create({
                    name: `${item.name} (${item.type})`,
                    description: `Booking for ${item.type}`,
                });
                let price = await stripe.prices.create({
                    unit_amount: item.price * 100,
                    currency: 'CAD',
                    product: product.id,
                });
                checkoutItems.push({
                    price: price.id,
                    quantity: 1,
                });
            }
            const session = await stripe.checkout.sessions.create({
                line_items: checkoutItems,
                mode: 'payment',
                success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
            });
            return res.redirect(303, session.url);

        } else {
            res.status(404).send("User not found");
        }
    } else {
        res.redirect("/");
    }
});

app.get("/cars", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'cars.html'));
    } else {
        res.redirect("/");
    }
});

app.post("/car-search", (req, res) => {
    // if (!req.session.user) {
    //     res.status(401).send("Unauthorized");
    //     return;
    // }
    console.log(req.body);
    const schema = joi.object({
        startLocationCode: joi.string().required(),
        endAddressLine: joi.string().required(),
        endCityName: joi.string().required(),
        endGeoCode: joi.string().required(),
        startDateTime: joi.date().required(),
        passengers: joi.number().min(1).max(10).required(),
    });
    const startDateTime = new Date(req.body.startDateTime);
    const { endCityName, endAddressLine, passengers, endGeoCode, startLocationCode } = req.body;
    let query = schema.validate({
        startLocationCode,
        endAddressLine,
        endCityName,
        endGeoCode,
        startDateTime,
        passengers,
    });
    if (query.error) {
        console.log("Invalid Data");
        res.status(400).send("Invalid data");
        return;
    }

    amadeus.shopping.transferOffers.post({
        startLocationCode,
        endAddressLine,
        endCityName,
        endGeoCode,
        startDateTime,
        passengers
    }).then(response => {
        res.send(response.result);
    }).catch(err => {
        console.error(err);
        res.status(500).send("Error fetching data from Amadeus API");
    });
});

app.get('/userName', (req, res) => {
    if (req.session.user) {
      return res.json({ name: req.session.user.name });
    } else {
      return res.status(401).json({ error: 'Not logged in' });
    }
  });

  app.get('/api/activities', async (req, res) => {
    try {
      const locs = (await amadeus.referenceData.locations.get({
        keyword: req.query.keyword,
        subType: 'CITY'
      })).data;
  
      if (!locs.length) return res.json([]);
  
      const { latitude, longitude } = locs[0].geoCode;
      const activities = (await amadeus.shopping.activities.get({
        latitude, longitude, radius: req.query.radius || 1
      })).data;
  
      res.json(activities);
  
    } catch {
      res.status(500).json({ error: 'Unable to fetch activities' });
    }
  });

app.post('/hotels', (req, res) => {
    if (req.session.user) {
        res.redirect('/hotels');
    } else {
        res.redirect('/login');
    }
});

app.post('/flights', (req, res) => {
    if (req.session.user) {
        res.redirect('/flights');
    } else {
        res.redirect('/login');
    }
});

app.post('/cars', (req, res) => {
    if (req.session.user) {
        res.redirect('/cars');
    } else {
        res.redirect('/login');
    }
});

app.post('/packages', (req, res) => {
    if (req.session.user) {
        res.redirect('/packages');
    } else {
        res.redirect('/login');
    }
});

app.post('/activities', (req, res) => {
    if (req.session.user) {
        res.redirect('/activities');
    } else {
        res.redirect('/login');
    }
});

app.post('/home', (req, res) => {
    if (req.session.user) {
        res.redirect('/planner');
    } else {
        res.redirect('/login');
    }
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

async function startServer() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const server = app.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`);
        });
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received. Closing server...');
            server.close();
            await client.close();
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
}

startServer();