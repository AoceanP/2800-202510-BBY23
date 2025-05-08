window.onload = () => {
    const location = document.getElementById('location');
    const temperature = document.getElementById('temperature');
    const description = document.getElementById('description');
    const error = document.getElementById('error');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                location.textContent = `Location: ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;

                try {
                    const response = await fetch(`/weather?lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();

                    if (response.ok) {
                        temperature.textContent = `${data.main.temp.toFixed(1)}°C`;
                        description.textContent = data.weather[0].description;
                        location.textContent = `Location: ${data.name}`;
                        error.textContent = '';
                    } else {
                        error.textContent = data.error;
                    }
                } catch (err) {
                    error.textContent = 'Error fetching weather data';
                }
            },
            (err) => {
                error.textContent = 'Location access denied. Please enable location services.';
            }
        );
    } else {
        error.textContent = 'Geolocation is not supported by this browser.';
    }
};