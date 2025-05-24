const searchBtn           = document.querySelector('#searchForm button');
const activityTemplate    = document.getElementById('activityTemplate');
const activitiesContainer = document.getElementById('activitiesContainer');
const loader              = document.querySelector('.loader');

searchBtn.addEventListener('click', async e => {
  e.preventDefault();

  const keyword = document.getElementById('searchInput').value.trim();
  activitiesContainer.innerHTML = '';
  loader.classList.remove('d-none');

  try {
    const res = await fetch(`/api/activities?keyword=${encodeURIComponent(keyword)}`);
    if (!res.ok) throw new Error(res.statusText);

    const activities = await res.json();
    loader.classList.add('d-none');

    if (!activities.length) {
      activitiesContainer.innerHTML = `
        <p class="text-warning">
          No activities found for “${keyword}”.
        </p>`;
      return;
    }

    activities.forEach(act => {
      const clone = activityTemplate.content.cloneNode(true);
      clone.querySelector('.activity-img').src              = act.pictures?.[0] || '/img/placeholder.png';
      clone.querySelector('.activity-name').textContent     = act.name;
      clone.querySelector('.activity-description').textContent = act.shortDescription || 'No description';
      clone.querySelector('.activity-price').textContent    = `${act.price.currencyCode} ${act.price.amount}`;

      const btn = clone.querySelector('.activity-link');
      btn.textContent = 'Add to Cart';
      btn.removeAttribute('href');
      btn.classList.add('btn-teal');
      btn.addEventListener('click', async () => {
        const payload = {
          id:    String(act.id),
          name:  act.name,
          price: act.price.amount,
          type:  'Activity'
        };

        try {
          const resp = await fetch('/addCartItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!resp.ok) {
            const errText = await resp.text();
            alert(`Couldn’t add to cart: ${errText}`);
            return;
          }

          alert('Activity added to cart!');
          window.location.href = '/cart';
        } catch (err) {
          console.error('Network error:', err);
          alert(`Network error: ${err.message}`);
        }
      });

      activitiesContainer.appendChild(clone);
    });

  } catch (err) {
    loader.classList.add('d-none');
    activitiesContainer.innerHTML = `
      <p class="text-danger">
        Error fetching activities: ${err.message}
      </p>`;
  }
});
