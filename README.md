# Xplor

Xplor is an app designed to keep travel costs low, and vacation time high by finding the best deals for hotels, car rentals, and flights.

## Project Technologies:

* Frontend
  * Bootstrap 5.3.2
* Backend
  * Amadeus 11
  * Node.js 20
  * Express 5
  * MongoDB 6.16
  * Stripe 18.1.1
  * Google GenAI 0.14
* Dev Tools
  * Nodemon 3.1

## List of Files:

Root:.
│   .env - Has all of the secret passwords, API keys, and various other things not exposed to the client side or GitHub
│   .gitignore - Tells git which files to ignore when add things to the repository
│   LICENSE - The license of the website, currently MIT license
│   main.js - Runs the website, frontend, and backend
│   package-lock.json - A more in-depth list of all of the node packages, their dependencies, and their hashed integrity checksums
│   package.json - Has a list of all of the required node packages for the website
│   README.md - This file, has all of the information for the website
│
└───public - Holds everything for the client side, such as the html, stylesheets, and client-side scripts
    │   404.html - The page loaded when a page/link cannot be found
    │   account.html
    │   activities.html
    │   cars.html - The page for finding the best deals on car rentals
    │   cart.html - Displays the cart to the user, along with the payment
    │   favicon.ico
    │   flights.html - The page for finding the best deals on flights
    │   footer.html
    │   home.html
    │   hotels.html - The page for finding the best deals on hotels
    │   index.html
    │   login.ejs
    │   nav.html
    │   packages.html
    │   planner.html
    │   signup.ejs
    │   transit.html
    │
    ├───css - All of the stylesheets for the pages
    │       flights.css
    │       footer.css
    │       home.css
    │       map.css
    │       nav.css
    │       snake.css
    │       style.css - The main stylesheet used on all pages
    │
    ├───img - All of the images on all pages
    │       bg_app.png
    │       clouds2.jpg
    │       cover.png
    │       Italy.jpg
    │       japan.jpeg
    │       logoname.png - The logo for the website
    │       mexico.jpeg
    │       montreal.jpg
    │       northvan.jpeg
    │       spain.jpeg
    │       toronto.jpeg
    │       vancouver.jpeg
    │
    └───js - The scripts for all the pages
            account.js
            activities.js
            cars.js - The script for getting deals on car rentals
            cart.js - Shows all of the cart items and redirects users to the payment page
            destination.js
            flights.js - The script for getting deals on flights
            home.js
            index.js
            map.js
            skeleton.js - Loads the navbar and footer on all the pages
            snake.js
            suggestions.js

## Setup:

1. Install Node.js and Node Package Manager (NPM) - [Node.js download](https://nodejs.org/en/download)
2. Go to the projects directory
3. Run `npm install` in the terminal to install all Node.js packages required to run the project
4. Create a file named .env
5. Add a line with SESSION_SECRET= and use some random set of characters, such as a UUID
6. Create a Mongo Database - [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database)
7. Within the .env file, add a line with MONGO_URI= and add your mongo url
8. Create an account on Amadeus - [Sign up for Amadeus](https://developers.amadeus.com/register)
9. Within the .env file, add AMADEUS_CLIENT_ID= and AMADEUS_CLIENT_SECRET= and put in your client ID and client secret for Amadeus respectively
10. Craete an API key for Google generative AI - [Google AI](https://ai.google.dev/)
11. Within the .env file, add GENAI_API_KEY= and put in your Google API key
12. Download the Stripe CLI - [Stripe CLI Download](https://docs.stripe.com/stripe-cli)
13. Create an account on Stripe - [Stripe Signup](https://dashboard.stripe.com/register?redirect=https%3A%2F%2Fdocs.stripe.com%2Fapi)
14. Within the .env file, add the line STRIPE_KEY= and add your Stripe key
15. Within the terminal, run `stripe login`, then `stripe listen --forward-to localhost:4242/webhook `
16. Copy the webhook secret from the terminal, then within your .env file, add the line STRIPE_WEBHOOK_SECRET= and add your Stripe webhook secret
17. (Optional, but recommended) Within your terminal, run `npm install -g nodemon` to install nodemon, which will automatically reload your app when changes are made
18. To run the program, run `node main.js`, or, if you've installed nodemon, simply run `nodemon`

## Features:

* Login and signup using MongoDB and express-session
* Finds the best deals for all car rentals, flights, and hotels using the Amadeus API
* Uses Google's generative AI for suggestions on budget travel
* Uses MongoDB and Stripe to pay for travel options

## Credits, References, and Licenses:

N/A

## APIs and AI Usage:

* Amadeus - Used for fetching realtime flights, car rentals, and hotels for booking
* Google Gen AI - Used for the suggestions page to generate suggestions for budget travel
* Mongo DB - Used for user and cart storage
* Stripe - Used to pay for the bookings

## Contact:

* Justice Plunkett - Backend development
  * Email: plunkettjustice@gmail.com
* Daniel Saavedra - Frontend development
  * Email: danielorcasaavedra778@gmail.com
* Marvin Yeung - Backend development
  * Email: yyeung19@my.bcit.ca
* Aleksander Panich
  * Email: unawakened.luck@gmail.com
* Amjadh Ebrahim
  * Email: aebrahim3@my.bcit.ca
