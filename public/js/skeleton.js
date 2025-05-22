document.addEventListener('DOMContentLoaded', function () {
  const navPlaceholders = document.querySelectorAll('#navbarPlaceholder');
  fetch('nav.html')
    .then(response => response.text())
    .then(data => {
      navPlaceholders.forEach(placeholder => {
        const parser = new DOMParser();
        const navDoc = parser.parseFromString(data, 'text/html');
        const navContent = navDoc.querySelector('nav').outerHTML;

        placeholder.innerHTML = navContent;

        if (window.location.pathname.endsWith('/home')) {
          const backBtn = placeholder.querySelector('#back-btn');
          if (backBtn) backBtn.style.display = 'none';
        }
      });
    })
    .catch(error => console.error('Error loading nav.html:', error));

    const footerPlaceholders = document.querySelectorAll('#footerPlaceholder');
    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            footerPlaceholders.forEach(placeholder => {
                placeholder.innerHTML = data;
            });
        })
        .catch(error => console.error('Error loading footer.html:', error));

        window.goBack = function() {
            window.location.href = '/planner';
        };

        fetch('/userName', { credentials: 'include' })
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then(user => {
          const nameEl = document.getElementById('name-goes-here');
          if (nameEl) nameEl.textContent = user.name;
        })
        .catch(() => {
        });

      window.goBack = () => { window.location.href = '/planner'; };
      window.redirectTo = function(path) { window.location.href = path;};
      
});
  
   
  
  