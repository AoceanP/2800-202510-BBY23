function toggleContent(id) {
    const content = document.getElementById(id);
    if (!content) {
        console.error(`Content element with ID ${id} not found`);
        return;
    }
    const isVisible = content.style.display === 'block';
    document.querySelectorAll('.card').forEach(card => card.style.display = 'none');
    content.style.display = isVisible ? 'none' : 'block';
    if (id === 'transactions-content' && !isVisible) {
        loadTransactions();
    }
}

function loadTransactions() {
    const noTransactions = document.getElementById('no-transactions');
    const list = document.getElementById('transaction-list');
    const template = document.getElementById('transaction-template');

    if (!noTransactions || !list || !template) {
        console.error('DOM elements not found:', { noTransactions, list, template });
        return;
    }

    fetch('/getTransactions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            list.innerHTML = '';
            if (data.length === 0) {
                noTransactions.style.display = 'block';
                noTransactions.textContent = 'No transactions found.';
            } else {
                noTransactions.style.display = 'none';
                data.forEach(item => {
                    const clone = template.content.cloneNode(true);
                    clone.querySelector('.transaction-name').textContent = item.name;
                    clone.querySelector('.transaction-type').textContent = `Type: ${item.type}`;
                    clone.querySelector('.transaction-price').textContent = `Price: ${item.price} CAD`;
                    clone.querySelector('.transaction-date').textContent = `Date: ${new Date(item.date).toLocaleString()}`;
                    list.appendChild(clone);
                });
            }
        })
        .catch(err => {
            console.error('Error fetching transactions:', err);
            noTransactions.style.display = 'block';
            noTransactions.textContent = 'Error loading transactions';
        });
}

document.getElementById('name-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('name-error');
    const successDiv = document.getElementById('name-success');
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    fetch('/updateNameWithPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                errorDiv.textContent = data.error;
                errorDiv.style.display = 'block';
            } else {
                successDiv.textContent = data.success;
                successDiv.style.display = 'block';
                document.getElementById('name-form').reset();
                toggleContent('name-content');
            }
        })
        .catch(err => {
            errorDiv.textContent = 'Error updating name';
            errorDiv.style.display = 'block';
        });
});

document.getElementById('password-form').addEventListener('submit', e => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('password-error');
    const successDiv = document.getElementById('password-success');
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    fetch('/updatePassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                errorDiv.textContent = data.error;
                errorDiv.style.display = 'block';
            } else {
                successDiv.textContent = data.success;
                successDiv.style.display = 'block';
                document.getElementById('password-form').reset();
                toggleContent('password-content');
            }
        })
        .catch(err => {
            errorDiv.textContent = 'Error updating password';
            errorDiv.style.display = 'block';
        });
});

document.getElementById('signout-btn').addEventListener('click', () => {
    toggleContent('signout-confirm');
});

document.getElementById('confirm-signout').addEventListener('click', () => {
    window.location.href = '/logout';
});

document.addEventListener('DOMContentLoaded', () => {
});