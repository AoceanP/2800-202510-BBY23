const searchBtn = document.getElementById("search-btn");
const dateInput = document.getElementById("start-date");
const offerList = document.getElementById("car-offers");
const offerTemplate = document.getElementById("car-offer-template");
var { lattitude, longitude } = { lattitude: 0, longitude: 0 };
dateInput.min = new Date().toISOString().split("T")[0];
searchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (lattitude === 0 && longitude === 0) {
        alert("Please select an address first.");
        return;
    }
    const startLocationCode = document.getElementById("start-airport").value;
    const address = String(document.getElementById("address").value);
    const addressSplit = address.split(" ");
    const endAddressLine = `${address.slice(addressSplit[0].length + 1)}, ${addressSplit[0]}`;
    const endCityName = document.getElementById("city").value;
    const date = dateInput.value;
    const time = document.getElementById("time").value;
    const startDateTime = new Date(`${date}T${time}`);
    const passengers = document.getElementById("passengers").value;
    fetch("/car-search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(
            {
                endGeoCode: `${lattitude},${longitude}`,
                startLocationCode,
                endAddressLine,
                startDateTime,
                endCityName,
                passengers
            }
        ),
    }).then(response => {
        return response.json();
    }).then(data => {
        console.log(data);
        for (carOffer of data.data) {
            let newOffer = offerTemplate.content.cloneNode(true);
            newOffer.querySelector(".offer-id").innerText = carOffer.id;
            newOffer.querySelector(".offer-picture").src = carOffer.vehicle.imageURL;
            newOffer.querySelector(".book-btn").addEventListener("click", e => {
                console.log(carOffer.id);
            });
            offerList.appendChild(newOffer);
        }
    }).catch(err => {
        console.error("Error fetching car data", err);
    });
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
    });
});

const addressForm = document.getElementById("address-form");
const addressShowBtn = document.getElementById("address-show-btn");
addressShowBtn.addEventListener("click", (e) => {
    e.preventDefault();
    addressForm.style.display = addressForm.style.display === "none" ? "inline" : "none";
});