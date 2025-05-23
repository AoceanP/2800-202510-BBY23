import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet-providers";
import "leaflet.markercluster/dist/MarkerCluster.css"; // Add this line
import "leaflet.markercluster/dist/MarkerCluster.Default.css"; // Add this line


const cityInput = document.getElementById('cityInput');
const searchButton = document.getElementById('searchButton');
const loadingIndicator = document.getElementById('loading');
const hotelListDiv = document.getElementById('hotelList');
const mapDiv = document.getElementById('map'); // Reference to the map container
const checkInDateInput = document.getElementById('checkInDateInput');
const checkOutDateInput = document.getElementById('checkOutDateInput');
const adultsInput = document.getElementById('adultsInput');
let map = null; // Declare with 'let' globally, initially null
let myClusterLayer = null; // Declare with 'let' globally, initially null
let mIcon = null; // 

//Formatting date for API
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

//initialize the map
function initializeMap() {
    if (map !== null) {
        map.remove();
    }
map = L.map("map").setView([49.25, -123.00], 13);


L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


mIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/128/684/684908.png",
    iconSize: [38, 38]
});



//cluster layer
myClusterLayer = window.L.markerClusterGroup({
    iconCreateFunction: function (cluster) {
        return L.divIcon({
            html:  `<div class="cluster-div">` + cluster.getChildCount() + `</div>`
        })
    }
});
map.addLayer(myClusterLayer);
}

/*
const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["tourism"="hotel"](49.1,-123.3,49.4,-122.8);way["tourism"="hotel"](49.1,-123.3,49.4,-122.8);relation["tourism"="hotel"](49.1,-123.3,49.4,-122.8););out center;`;
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

const CLIENT_ID = import.meta.env.VITE_AMADEUS_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_AMADEUS_CLIENT_SECRET;

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

//Batch

async function getHotelRatingsInBatches(hotelIDs, accessToken, batchSize = 10) {
    const allRatings = [];
    for (let i = 0; i < hotelIDs.length; i += batchSize) {
        const batch = hotelIDs.slice(i, i + batchSize);
        const hotelIdsString = batch.join(',');

        const sentimentsUrl = `https://test.api.amadeus.com/v2/e-reputation/hotel-sentiments?hotelIds=${hotelIdsString}`;

        const sentimentsResponse = await fetch(sentimentsUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const sentimentsData = await sentimentsResponse.json();

        if (!sentimentsResponse.ok) {
            console.error(`Error fetching sentiments for batch IDs: ${batch.join(', ')} - ${sentimentsData.errors?.[0]?.detail || JSON.stringify(sentimentsData)}`);
        }
        else if (sentimentsData.data && sentimentsData.data.length > 0) {
            allRatings.push(...sentimentsData.data);
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
    return allRatings;
}

async function getHotelOffers(cityCode, checkInDate, checkOutDate, adults, accessToken) {
    const url = new URL(`https://test.api.amadeus.com/v2/shopping/hotel-offers`);
    url.searchParams.append('cityCode', cityCode);
    url.searchParams.append('checkInDate', checkInDate);
    url.searchParams.append('checkOutDate', checkOutDate);
    url.searchParams.append('adults', adults);
    url.searchParams.append('roomQuantity', 1); // Assuming 1 room for simplicity
    url.searchParams.append('bestRateOnly', 'true');

    console.log("Fetching hotel offers URL:", url.toString());

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Failed to fetch hotel offers: ${data.errors?.[0]?.detail || JSON.stringify(data)}`);
    }

    return data.data;
}

//Modified to fetch offers first, then optionally sentiments
async function searchHotelsAndOffers(cityCode, checkInDate, checkOutDate, adults, accessToken) {
    const hotelsWithOffers = await getHotelOffers(cityCode, checkInDate, checkOutDate, adults, accessToken);

    if (!hotelsWithOffers || hotelsWithOffers.length === 0) {
        console.warn(`No hotel offers found for city code: ${cityCode} with the given dates and adults.`);
        return { hotels: [], ratings: [] };
    }

    const uniqueHotelIds = [...new Set(hotelsWithOffers.map(hotelOffer => hotelOffer.hotel.hotelId))];

    let sentimentsData = [];
    if (uniqueHotelIds.length > 0) {
        try {
            sentimentsData = await getHotelRatingsInBatches(uniqueHotelIds, accessToken);
        } catch (error) {
            console.error(`Problem fetching some hotel ratings in batches: ${error.message}`);
        }
    }
    return {
        hotels: hotelsWithOffers,
        ratings: sentimentsData
    }

}

/*
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

    //Call the batching function
    let sentimentsData = [];
    if (hotelIdsForRatings.length > 0) {
        try {
            sentimentsData = await getHotelRatingsInBatches(hotelIdsForRatings, accessToken);
        } catch (error) {console.error(`Problem fetching some hotel ratings in batches: ${error.message}`);
    }
 } else {
        console.warn('No hotel IDs to fetch sentiments for after city search.');
    }

    //Return both the hotels data and the collected sentiment data
    return {
        hotels: hotelsData.data,
        ratings: sentimentsData
    };
    
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
        }

*/

function displayHotels(hotelOffers, ratings) {
    hotelListDiv.classList.add('hidden');
    hotelListDiv.innerHTML = '';
    myClusterLayer.clearLayers();
    

    if (hotelOffers.length === 0) {
        hotelListDiv.innerHTML = '<p>No hotels or offers found for this city or no geoCode data available.</p>';
        map.setView([0, 0], 2); // Reset map view if no hotels
        return;
    }

    hotelOffers.forEach(hotelOffers => {
        const hotel = hotelOffers.hotel;
        const offer = hotelOffers.offers[0];

        const hotelRating = ratings.find(rating => rating.hotelId === hotel.hotelId);
        const overallRating = hotelRating ? hotelRating.overallRating || 'N/A' : 'N/A';
        const sentiments = hotelRating ? hotelRating.sentiments : null;

        const price = offer?.price?.total ? `${offer.price.total} ${offer.price.currency}` : 'Price N/A';
        const roomType = offer?.room?.description?.text || 'Room Type N/A';
        const boardType = offer?.boardType || 'Board Type N/A';

        const hotelCard = document.createElement('div');
            hotelCard.classList.add('hotel-card');
            hotelCard.innerHTML = `
                <h3>${hotel.name}</h3>
                <p><strong>ID:</strong> ${hotel.hotelId}</p>
                <p><strong>Chain Code:</strong> ${hotel.chainCode || 'N/A'}</p>
                <p><strong>Overall Rating:</strong> ${overallRating}</p>
                <p><strong>Price:</strong> ${price}</p>
                <p><strong>Room Type:</strong> ${roomType}</p>
                <p><strong>Board Type:</strong> ${boardType}</p>
        `;

        if (sentiments) {
            let sentimentHtml = '<p><strong>Sentiments:</strong></p><ul>';
            for (const category in sentiments) {
                sentimentHtml += `<li>${category}: ${sentiments[category].toFixed(2)}</li>`;
            }
            sentimentHtml += '</ul>';
            hotelCard.innerHTML += sentimentHtml;
        }

        hotelListDiv.appendChild(hotelCard);

        //Add marker for each hotel on the map
        if (hotel.geoCode && hotel.geoCode.latitude && hotel.geoCode.longitude) {
            const hotelLat = hotel.geoCode.latitude;
            const hotelLon = hotel.geoCode.longitude;

            let popupContent = `<strong>${hotel.name}</strong><br>
                                ID: ${hotel.hotelId}<br>
                                Price: ${price}<br>
                                Rating: ${overallRating}`;

              
                        if (sentiments) {
                        popupContent += `<br>Sentiments:`;
                        for (const category in sentiments) {
                        popupContent += `<br>&nbsp;&nbsp;${category}: ${sentiments[category].toFixed(2)}`;
                        }
                        }

            const marker = L.marker([hotelLat, hotelLon], {icon: mIcon})
                .bindPopup(popupContent);
            myClusterLayer.addLayer(marker);
        } else {
            console.warn(`Hotel ${hotel.name} (ID: ${hotel.hotelId}) has no geoCode data to display on map.`);
            hotelCard.innerHTML += '<p style="color:red; font-size:0.8em;">(No map coordinates available)</p>';
        }
    });

    // Fit map bounds to the markers, if any were added
    if (myClusterLayer.getLayers().length > 0) {
        map.fitBounds(myClusterLayer.getBounds());
    } else {
        console.warn("No hotels with geographic data found to display on map.");
        map.setView([0,0], 2);
    }


}
// Run everything
searchButton.addEventListener('click', async () => {
    const cityCode = cityInput.value.trim().toUpperCase();
    const checkInDate = checkInDateInput.value;
    const checkOutDate = checkOutDateInput.value;
    const adults = adultsInput.value;
    if (!cityCode || !checkInDate || !checkOutDate || !adults) {
        alert('Please fill in all search criteria: City Code, Check-in Date, Check-out Date, and Adults.');
        return;
    }

    if (new Date(checkInDate) >= new Date(checkOutDate)) {
        alert('Check-out date must be after check-in date.');
        return;
    }


    loadingIndicator.classList.remove('hidden'); // Show loading indicator
    hotelListDiv.innerHTML = ''; // Clear previous results
    if (myClusterLayer) myClusterLayer.clearLayers(); // Clear old markers
    if (map) map.setView([0,0], 2); // Reset map view initially

    try {
        if (map === null) {
            initializeMap();
        }

        const token = await getAccessToken();
        console.log('Access Token:', token);

        const hotelData = await searchHotelsAndOffers(cityCode, checkInDate, checkOutDate, adults, token);
        displayHotels(hotelData.hotels, hotelData.ratings);
        hotelListDiv.classList.remove('hidden');
        mapDiv.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
        hotelListDiv.classList.remove('hidden');
    }   catch (err) {
        console.error(`Application Error: ${err.message}`);

    }
});
                
