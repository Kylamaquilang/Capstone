import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './src/routes/auth.routes.js';
import productRoutes from './src/routes/product.routes.js';
import cartRoutes from './src/routes/cart.routes.js';
import checkoutRoutes from './src/routes/checkout.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import categoryRoutes from './src/routes/category.routes.js';
import profileRoutes from './src/routes/profile.routes.js'
import dashboardRoutes from './src/routes/dashboard.routes.js';

dotenv.config();
const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/checkout', checkoutRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/dashboard', dashboardRoutes)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));