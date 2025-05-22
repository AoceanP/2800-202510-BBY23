document.getElementById('searchForm').addEventListener('submit', async e => {
    e.preventDefault();
    const keyword = document.getElementById('searchInput').value.trim();
    const container = document.getElementById('activitiesContainer');
    container.innerHTML = '';

    const res = await fetch(`/api/activities?keyword=${encodeURIComponent(keyword)}`);

    if (!res.ok) {
      container.innerHTML = `<p class="text-danger">
        Error fetching activities: ${res.statusText}
      </p>`;
      return;
    }

    const activities = await res.json();

    if (!activities.length) {
      container.innerHTML = `<p class="text-warning">
        No activities found for “${keyword}”.
      </p>`;
      return;
    }

    renderActivities(activities);
  });

function renderActivities(activities) {
  const container = document.getElementById('activitiesContainer');
  const template  = document.getElementById('activityTemplate');
  activities.forEach(act => {
    const clone = template.content.cloneNode(true);
    clone.querySelector('.activity-img').src    = act.pictures?.[0] || '/img/placeholder.png';
    clone.querySelector('.activity-name').textContent         = act.name;
    clone.querySelector('.activity-description').textContent  = act.shortDescription || 'No description';
    clone.querySelector('.activity-price').textContent        = `${act.price.currencyCode} ${act.price.amount}`;
    clone.querySelector('.activity-link').href                = act.bookingLink;
    container.appendChild(clone);
  });
}

