import 'dotenv/config';
/*import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet-providers";

//initialize the map
const map = L.map("map").setView([49.25, -123.00], 13);


L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


const mIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/128/684/684908.png",
    iconSize: [38, 38]
});



//cluster layer
const myClusterLayer = window.L.markerClusterGroup({
    iconCreateFunction: function (cluster) {
        return L.divIcon({
            html:  `<div class="cluster-div">` + cluster.getChildCount() + `</div>`
        })
    }
})

//add markers
/*var marker1 = L.marker([49.2, -123.0], {icon: mIcon}).addTo(map);
var marker2 = L.marker([49.6, -123.2], {icon: mIcon}).addTo(map);
var marker3 = L.marker([49.0, -123.5], {icon: mIcon}).addTo(map);

myClusterLayer.addLayer(marker1);
myClusterLayer.addLayer(marker2);
myClusterLayer.addLayer(marker3);

fetch(overpassUrl)
    .then(res => res.json())
    .then(data => {
        data.elements.forEach(el => {
            if (el.lat && el.lon) {
                const name = el.tags?.name || "Unnamed Hotel";
                const marker = L.marker([el.lat, el.lon], {icon: mIcon})
                .bindPopup(`<strong>${name}</strong>`).addTo(map);
                myClusterLayer.addLayer(marker);
            }
            
        });
        map.addLayer(myClusterLayer);

        if (data.elements.length) {
            const bounds = myClusterLayer.getBounds();
            map.fitBounds(bounds);
        } else {
            console.warn("No hotels found in the area.");
        }
    })
    .catch(err => console.error("Error loading hotel data:", err));

*/

const CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

async function getAccessToken() {
    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Failed to get token: ${data.error_description || JSON.stringify(data)}`);
    }

    return data.access_token;
}



async function getHotelByCity(cityCode, accessToken) {
    const url = `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`;
    
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const hotelsData = await response.json();
    if (!response.ok) {
        throw new Error(`Failed to fetch hotels by city: ${hotelsData.errors?.[0]?.detail || JSON.stringify(hotelsData)}`);
    }

    if (!hotelsData.data || hotelsData.data.length === 0) {
        console.warn(`No hotels found for city code: ${cityCode}. Cannot fetch ratings.`);
        return {hotels: [], ratings: []};
    }

    const hotelIdsForRatings = hotelsData.data.map(hotel => hotel.hotelId);

    if (hotelIdsForRatings.length === 0) {
        console.warn('No hotel IDs to fetch sentiments for after city search.');
        return {hotels: [], ratings: []};
    }

    const hotelIdsComma = hotelIdsForRatings.join(',');
    const secondUrl = `https://test.api.amadeus.com/v2/e-reputation/hotel-sentiments?hotelIds=${hotelIdsComma}`;

    const sentimentsResponse = await fetch(secondUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const data_sentiments = await sentimentsResponse.json();

    if (!sentimentsResponse.ok) {
        throw new Error(`Failed to fetch hotel sentiments: ${data_sentiments.errors?.[0]?.detail || JSON.stringify(sentimentsData)}`);
    }
    return {
        hotels: hotelsData.data,
        ratings: data_sentiments.data
    }
    
/** 
    data.elements.forEach(el => {
        if (el.geoCode) {
            const name = el.tags?.name || "Unnamed Hotel";
                const marker = L.marker([el.lat, el.lon], {icon: mIcon})
                .bindPopup(`<strong>${name}</strong>`).addTo(map);
                myClusterLayer.addLayer(marker);
        }    
    });

    map.addLayer(myClusterLayer);

        if (data.elements.length) {
            const bounds = myClusterLayer.getBounds();
            map.fitBounds(bounds);
        } else {
            console.warn("No hotels found in the area.");
        }*/
}



// Run everything
(async () => {
    try {
        const token = await getAccessToken();
        console.log('Access Token:', token);

        const cityCode = 'COK';
        const hotelData = await getHotelByCity(cityCode, token);
        
        if(hotelData.ratings.length > 0) {
            console.log(`\n--- Hotels found in ${cityCode} ---`);
            hotelData.ratings.forEach(rating => {
                console.log(` Hotel ID: ${rating.hotelId}, Overall Rating: ${rating.overallRating || 'N/A'}`);
                for (const category in rating.sentiments) {
                    console.log(`      ${category}: ${rating.sentiments[category]}`);
                }
            }
            );
        } else {
            console.log(`No ratings found for hotels in ${cityCode}. (Remember test environment has limited rating data.)`);
        }
        
        console.log('Hotel Info:', JSON.stringify(hotelData, null, 2));
    } catch (err) {
        console.error(err.message);
    }
})();
