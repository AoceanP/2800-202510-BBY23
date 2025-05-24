const suggestionForm = document.getElementById('suggestion-form');
const loader         = document.querySelector('.loader');
const suggestionsList= document.getElementById('suggestions');

suggestionForm.addEventListener('submit', async event => {
  event.preventDefault();

  const locationInput = document.getElementById('location').value.trim();
  if (!locationInput) return;
  suggestionsList.innerHTML = '';
  loader.classList.remove('d-none');

  try {
    const response = await fetch('/getSuggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: locationInput })
    });

    if (!response.ok) throw new Error(response.statusText);

    const data = await response.text();
    loader.classList.add('d-none');

    const listItem = document.createElement('li');
    listItem.textContent = data;
    suggestionsList.appendChild(listItem);

  } catch (err) {
    loader.classList.add('d-none');
    const errItem = document.createElement('li');
    errItem.classList.add('text-danger');
    errItem.textContent = `Error getting suggestions: ${err.message}`;
    suggestionsList.appendChild(errItem);
  }
});
