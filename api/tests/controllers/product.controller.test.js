// tests/controllers/product.controller.test.js

import { jest } from '@jest/globals';
import { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../../src/controllers/product.controller.js';
import { pool } from '../../src/database/db.js';
import { ValidationError, NotFoundError } from '../../src/utils/errorHandler.js';

// Mock the database
jest.mock('../../src/database/db.js');
jest.mock('../../src/utils/socket-helper.js');

describe('Product Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = global.testUtils.createMockRequest();
    mockRes = global.testUtils.createMockResponse();
    mockNext = global.testUtils.createMockNext();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getAllProducts', () => {
    it('should return all products successfully', async () => {
      const mockProducts = [
        global.testUtils.mockProduct,
        { ...global.testUtils.mockProduct, id: 2, name: 'Product 2' }
      ];

      pool.query.mockResolvedValue([mockProducts]);

      await getAllProducts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        products: expect.any(Array),
        pagination: expect.any(Object)
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      await getAllProducts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error'
      });
    });

    it('should filter products by category', async () => {
      mockReq.query = { category: 'Electronics' };
      const mockProducts = [global.testUtils.mockProduct];

      pool.query
        .mockResolvedValueOnce([[{ total: 1 }]]) // Count query
        .mockResolvedValueOnce([mockProducts]); // Products query

      await getAllProducts(mockReq, mockRes);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['Electronics'])
      );
    });

    it('should search products by name', async () => {
      mockReq.query = { search: 'test' };
      const mockProducts = [global.testUtils.mockProduct];

      pool.query
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([mockProducts]);

      await getAllProducts(mockReq, mockRes);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.arrayContaining(['%test%', '%test%'])
      );
    });
  });

  describe('getProductById', () => {
    it('should return product by valid ID', async () => {
      mockReq.params = { id: '1' };
      const mockProduct = global.testUtils.mockProduct;

      pool.query
        .mockResolvedValueOnce([[mockProduct]]) // Main query
        .mockResolvedValueOnce([[]]); // Sizes query

      await getProductById(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'Test Product'
        })
      );
    });

    it('should throw ValidationError for invalid ID', async () => {
      mockReq.params = { id: 'invalid' };

      await getProductById(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });

    it('should throw NotFoundError for non-existent product', async () => {
      mockReq.params = { id: '999' };
      pool.query.mockResolvedValue([[]]);

      await getProductById(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });
  });

  describe('createProduct', () => {
    it('should create product successfully', async () => {
      mockReq.body = {
        name: 'New Product',
        description: 'New Description',
        price: 150.00,
        original_price: 120.00,
        stock: 30,
        category_id: 1,
        sizes: [
          { size: 'M', stock: 15, price: 150.00 },
          { size: 'L', stock: 15, price: 150.00 }
        ]
      };

      const mockConnection = global.testUtils.mockPoolGetConnection();
      pool.getConnection.mockResolvedValue(mockConnection);
      pool.query.mockResolvedValue([[{ insertId: 1 }]]);

      await createProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Product created successfully',
        productId: 1
      });
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      mockReq.body = {
        name: '',
        price: 'invalid',
        stock: -1
      };

      await createProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.any(String)
      });
    });

    it('should validate price relationship', async () => {
      mockReq.body = {
        name: 'Test Product',
        price: 100.00,
        original_price: 120.00, // Higher than selling price
        stock: 10
      };

      await createProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Selling price must be higher than cost price'
      });
    });

    it('should handle database transaction errors', async () => {
      mockReq.body = {
        name: 'Test Product',
        price: 150.00,
        original_price: 120.00,
        stock: 10
      };

      const mockConnection = global.testUtils.mockPoolGetConnection();
      mockConnection.query.mockRejectedValue(new Error('Database error'));
      pool.getConnection.mockResolvedValue(mockConnection);

      await createProduct(mockReq, mockRes);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        name: 'Updated Product',
        price: 200.00,
        stock: 25
      };

      const mockConnection = global.testUtils.mockPoolGetConnection();
      pool.getConnection.mockResolvedValue(mockConnection);
      pool.query
        .mockResolvedValueOnce([[global.testUtils.mockProduct]]) // Check existence
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update

      await updateProduct(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Product updated successfully'
      });
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should validate product exists before update', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { name: 'Updated Product' };

      pool.query.mockResolvedValue([[]]); // No product found

      await updateProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Product not found'
      });
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      mockReq.params = { id: '1' };

      const mockConnection = global.testUtils.mockPoolGetConnection();
      pool.getConnection.mockResolvedValue(mockConnection);
      pool.query
        .mockResolvedValueOnce([[global.testUtils.mockProduct]]) // Check existence
        .mockResolvedValueOnce([[]]) // Check cart items
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Soft delete

      await deleteProduct(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Product deleted successfully'
      });
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should prevent deletion if product is in cart', async () => {
      mockReq.params = { id: '1' };

      pool.query
        .mockResolvedValueOnce([[global.testUtils.mockProduct]]) // Check existence
        .mockResolvedValueOnce([[{ id: 1 }]]); // Cart items found

      await deleteProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Cannot delete product that is in active carts'
      });
    });
  });
});
