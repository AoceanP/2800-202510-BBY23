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

// Initialize MongoDB client
const client = new MongoClient(mongoURI);

// Session store with error handling
let mongoStore;
try {
    mongoStore = MongoStore.create({
        mongoUrl: mongoURI,
        collectionName: 'sessions'
    });
    mongoStore.on('error', (err) => {
        console.error('MongoStore error:', err);
    });
} catch (err) {
    console.error('Failed to initialize MongoStore:', err);
    process.exit(1);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

const db = client.db("travelplanner");
const users = db.collection("users");
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

app.use(session({
    resave: false,
    saveUninitialized: true,
    store: mongoStore,
    secret: process.env.SESSION_SECRET,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }));

// Middleware to check session
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized, please log in' });
    }
    next();
};

// Initialize Amadeus API client
const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

app.get('/api/destinations', async (req, res, next) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return res.status(400).json({ error: 'Missing keyword parameter' });
        }
        const response = await amadeus.referenceData.locations.get({
            subType: 'CITY',
            keyword: keyword,
            pageLimit: 6
        });
        const suggestions = response.data.map(loc => ({
            name: loc.address.cityName || loc.name,
            country: loc.address.countryName,
            iataCode: loc.iataCode
        }));
        res.json(suggestions);
    } catch (err) {
        next(err);
    }
});

app.get("/flight-search", requireAuth, async (req, res, next) => {
    try {
        const { originCode, destinationCode, departureDate } = req.query;
        const response = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: originCode,
            destinationLocationCode: destinationCode,
            departureDate: departureDate,
            adults: 1,
            max: '5',
            currencyCode: "CAD"
        });
        res.send(response.result);
    } catch (err) {
        next(err);
    }
});

app.post("/flight-confirmation", requireAuth, async (req, res, next) => {
    try {
        const { flight } = req.body;
        const response = await amadeus.shopping.flightOffers.pricing.post(
            JSON.stringify({
                'data': {
                    'type': 'flight-offers-pricing',
                    'flightOffers': [flight],
                }
            })
        );
        res.send(response.result);
    } catch (err) {
        next(err);
    }
});

app.post("/flight-booking", requireAuth, async (req, res, next) => {
    try {
        const { flight, documents } = req.body;
        const response = await amadeus.booking.flightOrders.post(
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
        );
        res.send(response.result);
    } catch (err) {
        next(err);
    }
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
        res.redirect("/home");
    } else {
        res.render('login', { error: req.session.error || null });
        req.session.error = null;
    }
});

app.get("/home", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.post('/loginUser', async (req, res, next) => {
    try {
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
        const user = await users.findOne({ email: req.body.email });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            req.session.error = "Email or password doesn't match.";
            return res.redirect("/login");
        }
        user.password = "";
        req.session.user = user;
        res.redirect("/home");
    } catch (err) {
        next(err);
    }
});

app.get("/planner", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get("/logout", (req, res, next) => {
    req.session.destroy(err => {
        if (err) {
            return next(err);
        }
        res.redirect("/login");
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

app.post('/signupUser', async (req, res, next) => {
    try {
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
        next(err);
    }
});

app.get("/flights", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'flights.html'));
});

app.get("/suggestions", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'suggestions.html'));
});

app.get("/activities", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'activities.html'));
});

app.get("/cars", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cars.html'));
});

app.get("/packages", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'packages.html'));
});

app.get("/hotels", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'hotels.html'));
});

app.post("/getSuggestions", requireAuth, async (req, res, next) => {
    try {
        const response = await aiBot.models.generateContent({
            contents: `What are some travel suggestions for a budget trip to ${req.body.location}? 
        Please make it one paragraph long.`,
            model: "gemini-2.5-flash-preview-04-17",
        });
        res.send(response.candidates[0].content.parts[0].text);
    } catch (err) {
        next(err);
    }
});

app.post("/addCartItem", requireAuth, async (req, res, next) => {
    try {
        const schema = joi.object({
            name: joi.string().required(),
            id: joi.string().required(),
            price: joi.number().required(),
            type: joi.string().required().valid("Flight", "Hotel", "Car", "Activity")
        });
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        await users.updateOne(
            { email: req.session.user.email },
            { $addToSet: { cart: req.body } }
        );
        res.send("Item added to cart");
    } catch (err) {
        next(err);
    }
});

app.get("/cart", requireAuth, async (req, res, next) => {
    try {
        const user = await users.findOne({ email: req.session.user.email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.sendFile(path.join(__dirname, "public", "cart.html"));
    } catch (err) {
        next(err);
    }
});

app.get("/getCartItems", requireAuth, async (req, res, next) => {
    try {
        const user = await users.findOne({ email: req.session.user.email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.send(user.cart || []);
    } catch (err) {
        next(err);
    }
});

app.post("/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
    try {
        const sig = req.headers["stripe-signature"];
        const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
        switch (event.type) {
            case "checkout.session.completed":
                console.log("Payment was successful!");
                break;
            default:
                console.warn(`Unhandled event type ${event.type}`);
        }
        res.json({ received: true });
    } catch (err) {
        next(err);
    }
});

app.post("/clearCart", requireAuth, async (req, res, next) => {
    try {
        await users.updateOne(
            { email: req.session.user.email },
            { $set: { cart: [] } }
        );
        res.send("Cart cleared");
    } catch (err) {
        next(err);
    }
});

app.get("/success", requireAuth, async (req, res, next) => {
    try {
        const sessionId = req.query.session_id;
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const user = await users.findOne({ email: req.session.user.email });
        if (!user || !session) {
            return res.status(404).send("User or session not found");
        }
        const cartItems = user.cart || [];
        const transactions = cartItems.map(item => ({
            id: item.id,
            type: item.type,
            name: item.name,
            price: item.price,
            date: new Date().toISOString(),
            sessionId: sessionId
        }));
        await users.updateOne(
            { email: req.session.user.email },
            {
                $push: { transactions: { $each: transactions } },
                $set: { cart: [] }
            }
        );
        res.send(`
      <h1>Payment Successful!</h1>
      <p>Session ID: ${sessionId}</p>
      <a href="/planner">Go to Home</a>
    `);
    } catch (err) {
        next(err);
    }
});

app.get("/cancel", (req, res) => {
    res.send(`
    <h1>Payment Cancelled</h1>
    <a href="/planner">Go to Home</a>
  `);
});

app.post("/checkout", requireAuth, async (req, res, next) => {
    try {
        const user = await users.findOne({ email: req.session.user.email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const cartItems = user.cart || [];
        let checkoutItems = [];
        for (let item of cartItems) {
            const product = await stripe.products.create({
                name: `${item.name} (${item.type})`,
                description: `Booking for ${item.type}`,
            });
            const price = await stripe.prices.create({
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
        res.redirect(303, session.url);
    } catch (err) {
        next(err);
    }
});

app.post("/car-search", async (req, res, next) => {
    try {
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
        const { error } = schema.validate({
            startLocationCode,
            endAddressLine,
            endCityName,
            endGeoCode,
            startDateTime,
            passengers,
        });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const response = await amadeus.shopping.transferOffers.post({
            startLocationCode,
            endAddressLine,
            endCityName,
            endGeoCode,
            startDateTime,
            passengers
        });
        res.send(response.result);
    } catch (err) {
        next(err);
    }
});

app.get('/userName', requireAuth, (req, res) => {
    res.json({ name: req.session.user.name });
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
      
app.get("/account", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'account.html'));
});

app.post("/updateName", requireAuth, async (req, res, next) => {
    try {
        const schema = joi.object({
            name: joi.string().required().min(1).messages({
                'any.required': 'Name is required.',
                'string.min': 'Name cannot be empty.'
            })
        });
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        await users.updateOne(
            { email: req.session.user.email },
            { $set: { name: req.body.name } }
        );
        req.session.user.name = req.body.name;
        res.json({ success: "Name updated successfully" });
    } catch (err) {
        next(err);
    }
});

app.post("/updateNameWithPassword", requireAuth, async (req, res, next) => {
    try {
        const schema = joi.object({
            name: joi.string().required().min(1).messages({
                'any.required': 'Name is required.',
                'string.min': 'Name cannot be empty.'
            }),
            password: joi.string().required().min(5).max(20).messages({
                'any.required': 'Password is required.',
                'string.min': 'Password must be at least 5 characters.',
                'string.max': 'Password cannot exceed 20 characters.'
            })
        });
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const user = await users.findOne({ email: req.session.user.email });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            return res.status(400).json({ error: "Incorrect password." });
        }
        await users.updateOne(
            { email: req.session.user.email },
            { $set: { name: req.body.name } }
        );
        req.session.user.name = req.body.name;
        res.json({ success: "Name updated successfully" });
    } catch (err) {
        next(err);
    }
});

app.post("/updatePassword", requireAuth, async (req, res, next) => {
    try {
        const schema = joi.object({
            currentPassword: joi.string().required().min(5).max(20).messages({
                'any.required': 'Current password is required.',
                'string.min': 'Current password must be at least 5 characters.',
                'string.max': 'Current password cannot exceed 20 characters.'
            }),
            newPassword: joi.string().required().min(5).max(20).messages({
                'any.required': 'New password is required.',
                'string.min': 'New password must be at least 5 characters.',
                'string.max': 'New password cannot exceed 20 characters.'
            }),
            confirmPassword: joi.string().required().min(5).max(20).messages({
                'any.required': 'Confirm password is required.'
            })
        });
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        if (req.body.newPassword !== req.body.confirmPassword) {
            return res.status(400).json({ error: "New passwords do not match." });
        }
        const user = await users.findOne({ email: req.session.user.email });
        if (!user || !(await bcrypt.compare(req.body.currentPassword, user.password))) {
            return res.status(400).json({ error: "Current password is incorrect." });
        }
        const hashedPassword = await bcrypt.hash(req.body.newPassword, saltRounds);
        await users.updateOne(
            { email: req.session.user.email },
            { $set: { password: hashedPassword } }
        );
        res.json({ success: "Password updated successfully" });
    } catch (err) {
        next(err);
    }
});

app.get("/getTransactions", requireAuth, async (req, res, next) => {
    try {
        const user = await users.findOne({ email: req.session.user.email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user.transactions || []);
    } catch (err) {
        next(err);
    }
});

app.post('/hotels', requireAuth, (req, res) => {
    res.redirect('/hotels');
});

app.post('/flights', requireAuth, (req, res) => {
    res.redirect('/flights');
});

app.post('/cars', requireAuth, (req, res) => {
    res.redirect('/cars');
});

app.post('/packages', requireAuth, (req, res) => {
    res.redirect('/packages');
});

app.post('/activities', requireAuth, (req, res) => {
    res.redirect('/activities');
});

app.post('/home', requireAuth, (req, res) => {
    res.redirect('/planner');
});

app.post('/account', requireAuth, (req, res) => {
    res.redirect('/account');
});

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    const status = err.status || 500;
    res.status(status).json({
        error: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message
    });
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