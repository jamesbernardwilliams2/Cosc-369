const express = require('express');
const app = express();
app.use(express.json());

// --- MIDDLEWARE ---
// In a real app, this would validate the OAuth token with Microsoft
const verifyMicrosoftToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });
    // Logic to decode token and extract microsoft_id goes here
    req.user = { microsoft_id: "extracted-id-from-token" }; 
    next();
};

// --- ROUTES ---

/**
 * @route   POST /api/register
 * @desc    Registers a new student user
 */
app.post('/api/register', verifyMicrosoftToken, async (req, res) => {
    const { email, fullName } = req.body;
    const { microsoft_id } = req.user;

    try {
        // DB logic: INSERT INTO users (email, full_name, microsoft_id) ...
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
});

/**
 * @route   GET /api/items
 * @desc    Returns paginated list of items with filters
 */
app.get('/api/items', async (req, res) => {
    const { search, category, limit = 10, page = 1 } = req.query;
    
    // DB logic: SELECT name, image FROM products WHERE ... LIMIT limit OFFSET (page-1)*limit
    res.json({ page, items: [] });
});

/**
 * @route   GET /api/items/:id
 * @desc    Returns full details for a specific item
 */
app.get('/api/items/:id', async (req, res) => {
    const productId = req.params.id;
    // DB logic: SELECT * FROM products WHERE id = productId
    res.json({ productId, details: {} });
});

/**
 * @route   POST /api/products
 * @desc    Uploads a new product
 */
app.post('/api/products', verifyMicrosoftToken, async (req, res) => {
    const { name, category, description, price, quantity, imageBlob } = req.body;
    const { microsoft_id } = req.user;

    // DB logic: INSERT INTO products (seller_id, name, ...) VALUES (microsoft_id, ...)
    res.status(201).json({ message: "Product listed", productId: "123" });
});

/**
 * @route   PATCH /api/products/:id
 * @desc    Modifies an existing listing (Only if seller matches)
 */
app.patch('/api/products/:id', verifyMicrosoftToken, async (req, res) => {
    const productId = req.params.id;
    const updates = req.body; // name, price, etc.
    const { microsoft_id } = req.user;

    // DB logic: UPDATE products SET ... WHERE id = productId AND seller_id = microsoft_id
    res.json({ message: "Product updated" });
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Deletes a listing
 */
app.delete('/api/products/:id', verifyMicrosoftToken, async (req, res) => {
    const productId = req.params.id;
    const { microsoft_id } = req.user;

    // DB logic: DELETE FROM products WHERE id = productId AND seller_id = microsoft_id
    res.json({ message: "Product deleted" });
});

/**
 * @route   POST /api/purchase
 * @desc    Decrements quantity and creates purchase record
 */
app.post('/api/purchase', verifyMicrosoftToken, async (req, res) => {
    const { productId } = req.body;
    const { microsoft_id } = req.user;

    // DB logic: 
    // 1. Check quantity > 0
    // 2. Decrement quantity
    // 3. INSERT INTO purchases (buyer_id, product_id)
    res.json({ message: "Purchase successful" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Marketplace API running on port ${PORT}`));