// Add this script to your main website analyzer index.html
// It checks if the user has entered the password

(function() {
    // Check if user is authenticated
    const isAuthenticated = sessionStorage.getItem('authenticated');

    // If not authenticated, redirect to password page
    if (!isAuthenticated || isAuthenticated !== 'true') {
        // Get current page name
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        // Don't redirect if we're already on the password page (index.html)
        if (currentPage !== 'index.html') {
            window.location.href = 'index.html';
        }
    }
})();