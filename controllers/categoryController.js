import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';

// Helper to generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// @desc    Get all categories (with product count)
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res, next) => {
  try {
    const filter = req.query.all === 'true' ? {} : { isActive: true };
    const categories = await Category.find(filter).sort({ displayOrder: 1, name: 1 }).lean();

    // Aggregate product counts per category
    const counts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c.count;
      countMap[c._id.toLowerCase()] = c.count;
    });

    const enriched = categories.map((cat) => ({
      ...cat,
      productCount: countMap[cat.name] || countMap[cat.name.toLowerCase()] || 0,
    }));

    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

// @desc    Get category by ID or slug
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = async (req, res, next) => {
  try {
    let category = null;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(req.params.id);
    }
    if (!category) {
      category = await Category.findOne({ slug: req.params.id.toLowerCase() });
    }

    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, image, displayOrder, isActive } = req.body;

    if (!name || !name.trim()) {
      res.status(400);
      throw new Error('Category name is required');
    }

    const finalSlug = (slug && slug.trim()) ? generateSlug(slug) : generateSlug(name);

    const existingName = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existingName) {
      res.status(400);
      throw new Error(`Category "${name.trim()}" already exists`);
    }

    const existingSlug = await Category.findOne({ slug: finalSlug });
    if (existingSlug) {
      res.status(400);
      throw new Error(`Category slug "${finalSlug}" is already in use`);
    }

    const category = await Category.create({
      name: name.trim(),
      slug: finalSlug,
      description: description || '',
      image: image || '',
      displayOrder: Number(displayOrder) || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }

    const { name, slug, description, image, displayOrder, isActive } = req.body;

    if (name && name.trim() !== category.name) {
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: category._id },
      });
      if (existing) {
        res.status(400);
        throw new Error(`Category name "${name.trim()}" already in use`);
      }
      category.name = name.trim();
    }

    if (slug && slug.trim()) {
      const finalSlug = generateSlug(slug);
      if (finalSlug !== category.slug) {
        const existingSlug = await Category.findOne({
          slug: finalSlug,
          _id: { $ne: category._id },
        });
        if (existingSlug) {
          res.status(400);
          throw new Error(`Category slug "${finalSlug}" already in use`);
        }
        category.slug = finalSlug;
      }
    }

    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (displayOrder !== undefined) category.displayOrder = Number(displayOrder);
    if (isActive !== undefined) category.isActive = isActive;

    const updated = await category.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }

    // Safety check: Prevent deletion if products exist in category
    const productCount = await Product.countDocuments({
      category: { $regex: new RegExp(`^${category.name}$`, 'i') },
    });

    if (productCount > 0) {
      res.status(400);
      throw new Error(
        `Cannot delete "${category.name}" because it contains ${productCount} product(s). Please reassign or archive those products first.`
      );
    }

    await category.deleteOne();
    res.json({ message: `Category "${category.name}" removed successfully` });
  } catch (error) {
    next(error);
  }
};
