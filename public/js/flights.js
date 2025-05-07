const searchBtn = document.getElementById('search-btn');
searchBtn.addEventListener('click', e => {
    e.preventDefault();
    const departure = document.getElementById('departure').value;
    fetch("/airpot-search/" + departure, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(response => {
        console.log(response);
        return response.json();
    }).then(data => {
        const airportList = document.getElementById('flight-list');
        airportList.innerHTML = ""; // Clear previous results
        console.log(data)
        data.forEach(airport => {
            const option = document.createElement('option');
            option.value = airport.iataCode;
            option.textContent = `${airport.name} (${airport.iataCode})`;
            airportList.appendChild(option);
        });
    }).catch(err => {
        console.error(err);
    }
    )
});