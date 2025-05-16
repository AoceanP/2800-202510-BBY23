document.addEventListener('DOMContentLoaded', function () {
    const navPlaceholders = document.querySelectorAll('#navbarPlaceholder');
    fetch('nav.html')
        .then(response => response.text())
        .then(data => {
            navPlaceholders.forEach(placeholder => {
                const parser = new DOMParser();
                const navDoc = parser.parseFromString(data, 'text/html');
                const navContent = navDoc.querySelector('.nav').outerHTML;
                const title = placeholder.textContent.trim();
                placeholder.innerHTML = navContent;
                const navDiv = placeholder.querySelector('.nav');
                const titleSpan = document.createElement('span');
                titleSpan.className = 'nav-title';
                titleSpan.textContent = title;
                navDiv.appendChild(titleSpan);
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

    if (document.querySelector("#date-calendar")) {
        const fp = flatpickr("#date-calendar", {
            inline: true,
            mode: "range",
            minDate: "today",
            showMonths: 4,
            dateFormat: "D M j",
            locale: { firstDayOfWeek: 0 },
        });
    }

    window.goBack = function() {
        window.location.href = '/planner';
    };
});