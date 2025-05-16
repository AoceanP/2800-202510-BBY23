const searchBtn = document.getElementById("search-btn");
var {lattitude, longitude} = {lat: 0, lon: 0};
searchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (lat === 0 && lon === 0) {
        alert("Please select an address first.");
        return;
    }
    
    fetch("/car-search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(
            { 
                lattitude, 
                longitude 
            }
        ),
    })
});

const ACCESS_TOKEN = 'pk.eyJ1IjoianVzdC1pY2VkIiwiYSI6ImNtYXB3M216NzAzY3EyaXB0azBiMnEyMGQifQ.xfJTva7VHOClsVJ8Cuxsww';
window.addEventListener('load', () => {
    // Enable autofill on the form
    const collection = mapboxsearch.autofill({
        accessToken: ACCESS_TOKEN
    });
    collection.addEventListener('retrieve', (e) => {
        // The first feature contains the selected address information
        const feature = e.detail.features[0];
        // Coordinates are in [longitude, latitude] format
        [longitude, lattitude] = feature.geometry.coordinates;
        // You can now use lat and lon as needed
        console.log('Latitude:', lattitude, 'Longitude:', longitude);
    });
});

const addressForm = document.getElementById("address-form");
const addressShowBtn = document.getElementById("address-show-btn");
addressShowBtn.addEventListener("click", (e) => {
    e.preventDefault();
    addressForm.style.display = addressForm.style.display === "none" ? "inline" : "none";
});