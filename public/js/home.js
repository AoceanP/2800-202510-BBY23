document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('flight-search-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d1   = encodeURIComponent(document.getElementById('departureDate').value);
    const d2   = encodeURIComponent(document.getElementById('returnDate').value);
    const dest = encodeURIComponent(document.getElementById('destination').value);
    window.location.href =
      `flights.html?departureDate=${d1}&returnDate=${d2}&destination=${dest}`;
  });
});
