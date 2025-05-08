window.onload = () => {
    const location = document.getElementById('location');
    const temperature = document.getElementById('temperature');
    const description = document.getElementById('description');
    const error = document.getElementById('error');
    const icon = document.getElementById('custom-icon');
  
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          location.textContent = `Location: ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
  
          try {
            const response = await fetch(`/weather?lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
  
            if (response.status === 200) {
                temperature.textContent = `${Math.round(data.main.temp)}°C`;
                description.textContent = data.weather[0].description;
                location.textContent = `Location: ${data.name}`;
                error.textContent = '';
              
                const condition = data.weather[0].main.toLowerCase();
              
                let iconName = 'default.png';
                if (condition.includes('clear')) {
                  iconName = 'sunny.png';
                } else if (condition.includes('cloud')) {
                  iconName = 'cloudy.png';
                } else if (condition.includes('rain')) {
                  iconName = 'rainy.png';
                } else if (condition.includes('storm') || condition.includes('thunder')) {
                  iconName = 'storm.png';
                } else if (condition.includes('snow')) {
                  iconName = 'snowy.png';
                } else if (condition.includes('mist') || condition.includes('fog')) {
                  iconName = 'foggy.png';
                }
              
                icon.classList.remove('visible');

            const iconPath = `images/${iconName}`;
            const newIcon = new Image();
            newIcon.src = iconPath;

            newIcon.onload = () => {
            icon.src = iconPath;
            icon.classList.add('visible');
            icon.style.display = 'block';

            const card = document.querySelector('.weather-card');

            card.classList.remove('bounce');
            void card.offsetWidth;

            card.classList.add('bounce');
            };
              } else {
                error.textContent = data.error || 'Failed to fetch weather data';
              }
          } catch (err) {
            error.textContent = 'Error fetching weather data';
          }
        },)}}