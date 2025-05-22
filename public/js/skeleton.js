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

  // Load footer.html
  const footerPlaceholders = document.querySelectorAll('#footerPlaceholder');
  fetch('footer.html')
    .then(response => response.text())
    .then(data => {
      footerPlaceholders.forEach(placeholder => {
        placeholder.innerHTML = data;
      });
    })
    .catch(error => console.error('Error loading footer.html:', error));
});