const suggestionForm = document.getElementById('suggestion-form');

suggestionForm.addEventListener('submit', async event => {
    event.preventDefault(); // Prevent the default form submission
    const location = document.getElementById('location').value;
    await fetch('/getSuggestions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ location })
    }).then(response => {
        if (response.ok) {
            return response.text();
        } else {
            throw new Error('Network response was not ok');
        }
    }).then(data => {
        const suggestionsList = document.getElementById('suggestions');
        suggestionsList.innerHTML = ''; // Clear previous suggestions
        const listItem = document.createElement('li');
        listItem.textContent = data;
        suggestionsList.appendChild(listItem);
    });
    
});