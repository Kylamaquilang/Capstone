import { pool } from '../database/db.js';

async function consolidatePEPantsSizes() {
  try {
    console.log('🔧 Consolidating P.E PANTS sizes...');
    
    // Get all P.E PANTS products
    const [pePantsProducts] = await pool.query(`
      SELECT id, name, description, price, stock, category_id, image, created_at
      FROM products 
      WHERE name = 'P.E PANTS' AND is_active = 1 AND deleted_at IS NULL
      ORDER BY created_at ASC
    `);
    
    console.log(`📦 Found ${pePantsProducts.length} P.E PANTS products`);
    
    if (pePantsProducts.length <= 1) {
      console.log('✅ Only one P.E PANTS product found, no consolidation needed');
      return;
    }
    
    // Use the first product as the main product
    const mainProduct = pePantsProducts[0];
    const otherProducts = pePantsProducts.slice(1);
    
    console.log(`📦 Main product: ID ${mainProduct.id}`);
    console.log(`📦 Other products: ${otherProducts.map(p => `ID ${p.id}`).join(', ')}`);
    
    // Get all sizes from all P.E PANTS products
    const allSizes = [];
    for (const product of pePantsProducts) {
      const [sizes] = await pool.query(`
        SELECT size, stock, price, is_active
        FROM product_sizes 
        WHERE product_id = ? AND is_active = 1
      `, [product.id]);
      
      allSizes.push(...sizes.map(size => ({
        ...size,
        original_product_id: product.id
      })));
    }
    
    console.log(`📏 All sizes found:`, allSizes);
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete existing sizes for the main product
      await connection.query(`
        DELETE FROM product_sizes WHERE product_id = ?
      `, [mainProduct.id]);
      
      // Insert all sizes for the main product
      for (const size of allSizes) {
        await connection.query(`
          INSERT INTO product_sizes (product_id, size, stock, price, is_active)
          VALUES (?, ?, ?, ?, ?)
        `, [mainProduct.id, size.size, size.stock, size.price, size.is_active]);
      }
      
      // Soft delete the other products
      for (const product of otherProducts) {
        await connection.query(`
          UPDATE products 
          SET is_active = 0, deleted_at = NOW()
          WHERE id = ?
        `, [product.id]);
      }
      
      await connection.commit();
      connection.release();
      
      console.log('✅ P.E PANTS sizes consolidated successfully');
      console.log(`📦 Main product ID: ${mainProduct.id}`);
      console.log(`📏 Total sizes: ${allSizes.length}`);
      
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

consolidatePEPantsSizes();

