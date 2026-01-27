document.addEventListener('DOMContentLoaded', function() {
    // Category filtering
    const filterButtons = document.querySelectorAll('.category-filter');
    const workItems = document.querySelectorAll('.work-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');

            const category = button.getAttribute('data-category');

            workItems.forEach(item => {
                if (category === 'all' || item.getAttribute('data-category') === category) {
                    item.style.display = 'block';
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'scale(1)';
                    }, 10);
                } else {
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        item.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    // Initialize all items as visible
    workItems.forEach(item => {
        item.style.opacity = '1';
        item.style.transform = 'scale(1)';
        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    });
});
