import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';

// Helper to generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// @desc    Fetch all products (with search, filter, sort, pagination)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    const pageSize = Number(req.query.limit) || Number(req.query.pageSize) || 12;
    const page = Number(req.query.page) || 1;

    // --- Search ---
    const keyword = req.query.keyword
      ? {
          $or: [
            { name: { $regex: req.query.keyword, $options: 'i' } },
            { description: { $regex: req.query.keyword, $options: 'i' } },
            { brand: { $regex: req.query.keyword, $options: 'i' } },
            { sku: { $regex: req.query.keyword, $options: 'i' } },
          ],
        }
      : {};

    // --- Category filter ---
    const categoryFilter = req.query.category && req.query.category !== 'all'
      ? { category: { $regex: new RegExp(`^${req.query.category}$`, 'i') } }
      : {};

    // --- Price filter ---
    const priceFilter = {};
    if (req.query.minPrice) {
      priceFilter.price = { ...priceFilter.price, $gte: Number(req.query.minPrice) };
    }
    if (req.query.maxPrice) {
      priceFilter.price = { ...priceFilter.price, $lte: Number(req.query.maxPrice) };
    }

    // --- Rating filter ---
    const ratingFilter = req.query.rating
      ? { rating: { $gte: Number(req.query.rating) } }
      : {};

    // --- Featured filter ---
    const featuredFilter = req.query.featured !== undefined
      ? { featured: req.query.featured === 'true' }
      : {};

    // --- Active status: by default only show active products unless req.query.all === 'true' ---
    const activeFilter = req.query.all === 'true'
      ? (req.query.status === 'active' ? { isActive: true } : (req.query.status === 'inactive' ? { isActive: false } : {}))
      : { isActive: { $ne: false } };

    // --- Stock filter (for admin) ---
    const stockFilter = {};
    if (req.query.stockStatus === 'in_stock') {
      stockFilter.countInStock = { $gt: 0 };
    } else if (req.query.stockStatus === 'low_stock') {
      stockFilter.countInStock = { $gt: 0, $lte: 5 };
    } else if (req.query.stockStatus === 'out_of_stock') {
      stockFilter.countInStock = 0;
    }

    // --- Combine all filters ---
    const filters = {
      ...keyword,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
      ...featuredFilter,
      ...activeFilter,
      ...stockFilter,
    };

    // --- Sort ---
    let sortObj = { createdAt: -1 }; // default: newest first
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price_asc':
          sortObj = { price: 1 };
          break;
        case 'price_desc':
          sortObj = { price: -1 };
          break;
        case 'rating':
          sortObj = { rating: -1 };
          break;
        case 'name_asc':
          sortObj = { name: 1 };
          break;
        case 'name_desc':
          sortObj = { name: -1 };
          break;
        case 'stock_asc':
          sortObj = { countInStock: 1 };
          break;
        case 'stock_desc':
          sortObj = { countInStock: -1 };
          break;
        case 'newest':
        default:
          sortObj = { createdAt: -1 };
      }
    }

    const count = await Product.countDocuments(filters);
    const products = await Product.find(filters)
      .sort(sortObj)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    // --- Get distinct categories for filter UI ---
    const categories = await Product.distinct('category');

    res.json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res, next) => {
  try {
    let product = null;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(req.params.id);
    }
    if (!product) {
      product = await Product.findOne({ slug: req.params.id.toLowerCase() });
    }

    if (product) {
      res.json(product);
    } else {
      res.status(404);
      throw new Error('Product not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      price,
      originalPrice,
      category,
      countInStock,
      description,
      image,
      images,
      brand,
      sku,
      slug,
      sizes,
      colors,
      tags,
      featured,
      isNewProduct,
      isActive,
      material,
      accent,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400);
      throw new Error('Product name is required');
    }

    if (!category || !category.trim()) {
      res.status(400);
      throw new Error('Product category is required');
    }

    if (price === undefined || isNaN(Number(price))) {
      res.status(400);
      throw new Error('Valid product price is required');
    }

    const finalSlug = (slug && slug.trim())
      ? generateSlug(slug)
      : `${generateSlug(name)}-${Date.now().toString(36)}`;

    const finalSku = (sku && sku.trim())
      ? sku.trim().toUpperCase()
      : `AUR-${category.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Verify SKU uniqueness if provided
    if (sku && sku.trim()) {
      const existingSku = await Product.findOne({ sku: finalSku });
      if (existingSku) {
        res.status(400);
        throw new Error(`SKU "${finalSku}" is already in use by another product`);
      }
    }

    const product = new Product({
      user: req.user._id,
      name: name.trim(),
      slug: finalSlug,
      sku: finalSku,
      brand: (brand && brand.trim()) || 'AURELIA',
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : Number(price),
      category: category.trim(),
      countInStock: countInStock !== undefined ? Number(countInStock) : 0,
      description: description || '',
      image: image || (images && images.length > 0 ? images[0] : '/assets/products/sweaters/midnight.svg'),
      images: Array.isArray(images) && images.length > 0 ? images : [image || '/assets/products/sweaters/midnight.svg'],
      sizes: Array.isArray(sizes) ? sizes : (typeof sizes === 'string' && sizes ? sizes.split(',').map((s) => s.trim()) : []),
      colors: Array.isArray(colors) ? colors : (typeof colors === 'string' && colors ? colors.split(',').map((c) => c.trim()) : []),
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' && tags ? tags.split(',').map((t) => t.trim()) : []),
      featured: Boolean(featured),
      isNewProduct: Boolean(isNewProduct),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      material: material || '',
      accent: accent || '#C6A15B',
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const {
      name,
      price,
      originalPrice,
      category,
      countInStock,
      description,
      image,
      images,
      brand,
      sku,
      slug,
      sizes,
      colors,
      tags,
      featured,
      isNewProduct,
      isActive,
      material,
      accent,
    } = req.body;

    if (name !== undefined) product.name = name.trim();
    if (price !== undefined) product.price = Number(price);
    if (originalPrice !== undefined) product.originalPrice = Number(originalPrice);
    if (category !== undefined) product.category = category.trim();
    if (countInStock !== undefined) product.countInStock = Number(countInStock);
    if (description !== undefined) product.description = description;
    if (brand !== undefined) product.brand = brand.trim();
    if (material !== undefined) product.material = material;
    if (accent !== undefined) product.accent = accent;

    if (image !== undefined) product.image = image;
    if (images !== undefined) {
      product.images = Array.isArray(images) ? images : [images];
      if (!product.image && product.images.length > 0) {
        product.image = product.images[0];
      }
    }

    if (sku && sku.trim()) {
      const formattedSku = sku.trim().toUpperCase();
      if (formattedSku !== product.sku) {
        const existingSku = await Product.findOne({
          sku: formattedSku,
          _id: { $ne: product._id },
        });
        if (existingSku) {
          res.status(400);
          throw new Error(`SKU "${formattedSku}" is already in use by another product`);
        }
        product.sku = formattedSku;
      }
    }

    if (slug && slug.trim()) {
      product.slug = generateSlug(slug);
    }

    if (sizes !== undefined) {
      product.sizes = Array.isArray(sizes) ? sizes : sizes.split(',').map((s) => s.trim());
    }
    if (colors !== undefined) {
      product.colors = Array.isArray(colors) ? colors : colors.split(',').map((c) => c.trim());
    }
    if (tags !== undefined) {
      product.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
    }

    if (featured !== undefined) product.featured = Boolean(featured);
    if (isNewProduct !== undefined) product.isNewProduct = Boolean(isNewProduct);
    if (isActive !== undefined) product.isActive = Boolean(isActive);

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product active status (activate / archive)
// @route   PATCH /api/products/:id/status
// @access  Private/Admin
export const toggleProductStatus = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    product.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !product.isActive;
    const updated = await product.save();

    res.json({
      message: `Product "${product.name}" is now ${product.isActive ? 'active' : 'archived'}`,
      product: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product (with order history safety check)
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    // Safety check: is this product part of any existing orders?
    const hasOrders = await Order.findOne({ 'orderItems.product': product._id });
    if (hasOrders) {
      // If force archive is requested or default safety mode:
      product.isActive = false;
      await product.save();
      return res.status(200).json({
        archived: true,
        message: `Product "${product.name}" is referenced in historical customer orders and cannot be deleted. It has been safely archived (deactivated) instead.`,
      });
    }

    await product.deleteOne();
    res.json({
      archived: false,
      message: `Product "${product.name}" deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};
