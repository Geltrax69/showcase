document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('products-container');
    const cartBadge = document.getElementById('cart-badge');
    let totalCartItems = 0;

    // Helper to update the top right cart badge
    function updateCartBadge() {
        cartBadge.textContent = totalCartItems;
        // Add a small pop animation
        cartBadge.classList.remove('pop');
        void cartBadge.offsetWidth; // trigger reflow
        cartBadge.classList.add('pop');
    }

    // Fetch image links from the 'imageslinks' file
    fetch('imageslinks?t=' + new Date().getTime())
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }
            return response.text();
        })
        .then(text => {
            const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
            productsContainer.innerHTML = '';
            
            const titles = [
                "Elegant Silk Saree", 
                "Handwoven Cotton Saree", 
                "Designer Georgette Saree", 
                "Traditional Banarasi Saree", 
                "Chiffon Party Wear Saree",
                "Kanjeevaram Bridal Saree",
                "Printed Linen Saree"
            ];

            lines.forEach((url, index) => {
                const minPrice = 5000;
                const maxPrice = 80000;
                let price = Math.floor(Math.random() * ((maxPrice - minPrice) / 100 + 1)) * 100 + minPrice;
                if (price > maxPrice) price = maxPrice;

                const formattedPrice = '₹ ' + price.toLocaleString('en-IN');
                const title = titles[index % titles.length];
                const description = "Beautifully crafted saree perfect for any occasion. Features intricate design and premium quality fabric.";
                
                // Generate random rating between 4.0 and 5.0
                const rating = (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1);

                const exclusiveTagHTML = index === 0 
                    ? `<span class="exclusive-tag">Online exclusive</span>` 
                    : `<span class="exclusive-tag empty"></span>`;

                const cardHTML = `
                    <div class="column product-card">
                        <div class="card-header">
                            ${exclusiveTagHTML}
                            <button class="bookmark-btn" aria-label="Bookmark">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                                </svg>
                            </button>
                        </div>
                        <div class="product-image">
                            <img src="${url}" alt="${title}" onerror="this.src='https://placehold.co/400x500?text=Image+Not+Found'">
                        </div>
                        <h3 class="product-title">${title}</h3>
                        
                        <!-- Rating -->
                        <div class="product-rating">
                            <span class="star">★</span> <span class="rating-value">${rating}</span>
                        </div>
                        
                        <p class="product-description">${description}</p>
                        <div class="product-price">${formattedPrice}</div>
                        
                        <!-- New Cart Controls -->
                        <div class="cart-controls">
                            <button class="add-to-cart-btn">Add to cart</button>
                            <div class="quantity-selector" style="display: none;">
                                <button class="qty-minus">-</button>
                                <span class="qty-count">1</span>
                                <button class="qty-plus">+</button>
                            </div>
                        </div>
                    </div>
                `;
                productsContainer.insertAdjacentHTML('beforeend', cardHTML);
            });

            attachEventListeners();
        })
        .catch(error => {
            console.error('Error loading imageslinks:', error);
            productsContainer.innerHTML = `<p style="text-align: center; width: 100%; color: #b54a22; padding: 40px;">Failed to load images. Please ensure your local server is running.</p>`;
        });

    function attachEventListeners() {
        // Bookmark Logic
        const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
        bookmarkBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                this.classList.toggle('active');
            });
        });

        // Cart +/- Logic
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            const addBtn = card.querySelector('.add-to-cart-btn');
            const qtySelector = card.querySelector('.quantity-selector');
            const qtyCount = card.querySelector('.qty-count');
            const minusBtn = card.querySelector('.qty-minus');
            const plusBtn = card.querySelector('.qty-plus');
            
            let quantity = 0;

            addBtn.addEventListener('click', () => {
                quantity = 1;
                totalCartItems += 1;
                updateCartBadge();
                
                qtyCount.textContent = quantity;
                addBtn.style.display = 'none';
                qtySelector.style.display = 'flex';
            });

            plusBtn.addEventListener('click', () => {
                quantity += 1;
                totalCartItems += 1;
                updateCartBadge();
                qtyCount.textContent = quantity;
            });

            minusBtn.addEventListener('click', () => {
                quantity -= 1;
                totalCartItems -= 1;
                updateCartBadge();
                
                if (quantity === 0) {
                    qtySelector.style.display = 'none';
                    addBtn.style.display = 'block';
                } else {
                    qtyCount.textContent = quantity;
                }
            });
        });
    }
});
