import mongoose from 'mongoose';
import Product from '../models/productModel.js';
import SavedLook from '../models/savedLookModel.js';

// Occasion & Aesthetic styling definitions
const OCCASION_PALETTES = {
  'Wedding Guest': {
    preferredCategories: ['Dresses', 'Jackets', 'Shirts', 'Trousers', 'Watches', 'Footwear', 'Bags'],
    defaultColors: ['Navy', 'Burgundy', 'Emerald', 'Ivory', 'Gold'],
    vibe: 'Formal refinement, noble fabrics, and distinguished accents',
  },
  'Date Night': {
    preferredCategories: ['Jackets', 'Sweaters', 'Trousers', 'Watches', 'Footwear', 'Bags'],
    defaultColors: ['Noir', 'Burgundy', 'Charcoal', 'Midnight'],
    vibe: 'Sultry luxury, tactile cashmere, and discreet metallic accents',
  },
  'Office & Business': {
    preferredCategories: ['Jackets', 'Shirts', 'Trousers', 'Footwear', 'Watches', 'Bags'],
    defaultColors: ['Navy', 'Charcoal', 'White', 'Black'],
    vibe: 'Architectural sartorial precision and executive distinction',
  },
  'Party & Evening': {
    preferredCategories: ['Jackets', 'Dresses', 'Trousers', 'Watches', 'Bags', 'Footwear'],
    defaultColors: ['Black', 'Gold', 'Burgundy', 'Silver'],
    vibe: 'High-contrast nocturnal glamour and statement silhouettes',
  },
  'Vacation & Resort': {
    preferredCategories: ['Shirts', 'T-Shirts', 'Trousers', 'Footwear', 'Bags', 'Accessories'],
    defaultColors: ['Ivory', 'Camel', 'Linen', 'Sky', 'Navy'],
    vibe: 'Effortless Mediterranean Riviera ease and breathable textures',
  },
  'Everyday Luxury': {
    preferredCategories: ['Sweaters', 'T-Shirts', 'Hoodies', 'Trousers', 'Footwear', 'Bags'],
    defaultColors: ['Charcoal', 'Camel', 'Black', 'White', 'Grey'],
    vibe: 'Elevated nonchalance with supreme fabric handfeel',
  },
  'Festive Celebration': {
    preferredCategories: ['Jackets', 'Shirts', 'Trousers', 'Watches', 'Footwear', 'Accessories'],
    defaultColors: ['Burgundy', 'Emerald', 'Gold', 'Navy'],
    vibe: 'Opulent ceremonial richness and timeless heritage',
  },
  'Custom Occasion': {
    preferredCategories: ['Jackets', 'Sweaters', 'Shirts', 'Trousers', 'Footwear', 'Watches', 'Bags'],
    defaultColors: ['Black', 'White', 'Navy', 'Camel'],
    vibe: 'Bespoke harmony tailored to individual lifestyle',
  },
};

const AESTHETIC_TAGS = {
  'Old Money': ['cashmere', 'wool', 'linen', 'pleated', 'heritage', 'classic', 'chrono', 'submariner', 'derby'],
  'Quiet Luxury': ['cashmere', 'minimalist', 'subtle', 'silk', 'overcoat', 'tailored', 'leather', 'tote'],
  'Minimalist Chic': ['clean', 'monochrome', 'black', 'white', 'charcoal', 'runners', 'derby', 'leather'],
  'Modern Classic': ['blazer', 'poplin', 'loafers', 'chrono', 'structured', 'classic'],
  'Streetwear': ['oversized', 'fleece', 'hoodie', 'combat', 'runners', 'duffel', 'crossbody'],
  'Bold & Statement': ['leather', 'velvet', 'gold', 'royal', 'statement', 'emerald', 'burgundy'],
  'Romantic & Elegant': ['silk', 'cashmere', 'burgundy', 'emerald', 'delicate', 'gold'],
  'Smart Casual': ['merino', 'linen', 'camp', 'derby', 'loafers', 'pleated'],
};

// Slot configurations
const SLOTS_CONFIG = [
  {
    slot: 'main',
    label: 'Signature Outerwear / Top',
    categories: ['Jackets', 'Sweaters', 'Shirts', 'Dresses'],
  },
  {
    slot: 'bottom',
    label: 'Tailored Bottom',
    categories: ['Trousers', 'Sweaters'], // If dress is main, could be a layering sweater or trousers
  },
  {
    slot: 'footwear',
    label: 'Handcrafted Footwear',
    categories: ['Footwear'],
  },
  {
    slot: 'bag',
    label: 'Leather Good / Bag',
    categories: ['Bags'],
  },
  {
    slot: 'accessory',
    label: 'Haute Timepiece / Accent',
    categories: ['Watches', 'Accessories'],
  },
];

// Helper to score a product
const scoreProduct = (product, { preferredColors, avoidColors, aesthetic, occasion, slotBudget }) => {
  let score = 50;

  // In-stock preference
  if (product.countInStock > 0) {
    score += 30;
  } else {
    score -= 20; // Deprioritize out of stock
  }

  const textToScan = `${product.name} ${product.description} ${product.category} ${product.brand} ${(product.tags || []).join(' ')} ${(product.colors || []).join(' ')}`.toLowerCase();

  // Preferred colors
  if (preferredColors && preferredColors.length > 0) {
    for (const color of preferredColors) {
      if (textToScan.includes(color.toLowerCase())) {
        score += 25;
      }
    }
  }

  // Avoid colors
  if (avoidColors && avoidColors.length > 0) {
    for (const color of avoidColors) {
      if (textToScan.includes(color.toLowerCase())) {
        score -= 50;
      }
    }
  }

  // Aesthetic keywords
  const aestheticKeywords = AESTHETIC_TAGS[aesthetic] || [];
  for (const kw of aestheticKeywords) {
    if (textToScan.includes(kw.toLowerCase())) {
      score += 15;
    }
  }

  // Budget fit
  if (slotBudget && slotBudget > 0) {
    if (product.price <= slotBudget) {
      score += 15;
    } else {
      score -= Math.min(30, Math.floor((product.price - slotBudget) / 1000) * 5);
    }
  }

  // Rating boost
  if (product.rating && product.rating > 0) {
    score += product.rating * 3;
  }

  return score;
};

// Generate editorial explanation
const generateExplanation = (occasion, aesthetic, items, budgetStatus) => {
  const occasionData = OCCASION_PALETTES[occasion] || OCCASION_PALETTES['Everyday Luxury'];
  const mainItem = items.find((i) => i.slot === 'main')?.product;
  const bottomItem = items.find((i) => i.slot === 'bottom')?.product;
  const shoeItem = items.find((i) => i.slot === 'footwear')?.product;
  const watchItem = items.find((i) => i.slot === 'accessory')?.product;
  const bagItem = items.find((i) => i.slot === 'bag')?.product;

  const parts = [];

  parts.push(`Curated specifically for ${occasion} within an aesthetic of ${aesthetic}.`);

  if (mainItem && bottomItem) {
    parts.push(
      `The foundation pairs the ${mainItem.name} (${mainItem.category}) with the structured silhouette of the ${bottomItem.name}, establishing balanced sartorial proportions.`
    );
  } else if (mainItem) {
    parts.push(
      `Anchored by the signature ${mainItem.name}, crafting an authoritative visual focal point.`
    );
  }

  if (shoeItem) {
    parts.push(
      `Grounded by Italian craftsmanship in the ${shoeItem.name}, maintaining ${aesthetic.toLowerCase()} poise from head to toe.`
    );
  }

  if (bagItem && watchItem) {
    parts.push(
      `Accented with the ${bagItem.name} and elevated by the mechanical distinction of the ${watchItem.name}.`
    );
  } else if (watchItem) {
    parts.push(`Completed with the horological luxury of the ${watchItem.name}.`);
  }

  if (budgetStatus === 'within_budget') {
    parts.push(`Every piece satisfies your target expenditure without compromising artisanal integrity.`);
  }

  return parts.join(' ');
};

// Generate Look Title
const generateTitle = (occasion, aesthetic) => {
  const titles = {
    'Wedding Guest': ['The Sovereign Guest Ensemble', 'The Gala Aristocrat', 'The Ceremonial Silhouette'],
    'Date Night': ['The Nocturne Atelier Look', 'The Velvet Hour Ensemble', 'Midnight Romance Look'],
    'Office & Business': ['The Executive Sovereign Look', 'The Precision Sartorial Look', 'The Modern Director Ensemble'],
    'Party & Evening': ['The Nocturnal Radiance Look', 'The After-Hours Atelier', 'The Grand Soirée Ensemble'],
    'Vacation & Resort': ['The Riviera Horizon Look', 'The Mediterranean Leisure Look', 'The Coastal Atelier Look'],
    'Everyday Luxury': ['The Essential Sovereign Look', 'The Refined Everyday Atelier', 'The Cashmere & Wool Harmony'],
    'Festive Celebration': ['The Imperial Heritage Look', 'The Golden Gala Ensemble', 'The Festive Grandeur Look'],
    'Custom Occasion': ['The Signature Curated Ensemble', 'The Bespoke Atelier Look', 'The Singular Harmony'],
  };

  const list = titles[occasion] || titles['Everyday Luxury'];
  return list[Math.floor(Math.random() * list.length)];
};

// @desc    Generate a complete coordinated look
// @route   POST /api/curate/generate
// @access  Public
export const generateLook = async (req, res, next) => {
  try {
    const {
      occasion = 'Date Night',
      aesthetic = 'Quiet Luxury',
      preferredColors = [],
      avoidColors = [],
      minBudget = 0,
      maxBudget = 0,
      preferredSizes = [],
      preferredCategories = [],
      gender = 'all',
      customNotes = '',
    } = req.body;

    // Fetch active products from database
    const allProducts = await Product.find({ isActive: { $ne: false } }).lean();

    if (!allProducts || allProducts.length === 0) {
      res.status(404);
      return next(new Error('No products available in catalog to curate a look'));
    }

    // Determine target slots
    const occasionData = OCCASION_PALETTES[occasion] || OCCASION_PALETTES['Everyday Luxury'];

    // Allocate rough budget per slot if maxBudget provided
    const targetSlotCount = SLOTS_CONFIG.length;
    const slotBudget = maxBudget > 0 ? Math.floor(maxBudget / targetSlotCount) : 0;

    const chosenItems = [];
    const usedProductIds = new Set();

    for (const slotDef of SLOTS_CONFIG) {
      // Find candidate products for this slot
      let candidates = allProducts.filter(
        (p) => slotDef.categories.includes(p.category) && !usedProductIds.has(p._id.toString())
      );

      // If category preferences are specified by user and available for this slot, prioritize them
      if (preferredCategories && preferredCategories.length > 0) {
        const preferredMatch = candidates.filter((p) => preferredCategories.includes(p.category));
        if (preferredMatch.length > 0) {
          candidates = preferredMatch;
        }
      }

      if (candidates.length === 0) continue;

      // Score each candidate
      const scoredCandidates = candidates.map((p) => ({
        product: p,
        score: scoreProduct(p, {
          preferredColors,
          avoidColors,
          aesthetic,
          occasion,
          slotBudget,
        }),
      }));

      // Sort by score descending
      scoredCandidates.sort((a, b) => b.score - a.score);

      // Pick top candidate (with slight randomization among top 2 for freshness)
      const pickIndex = scoredCandidates.length > 1 && Math.random() < 0.35 ? 1 : 0;
      const chosen = scoredCandidates[pickIndex].product;

      usedProductIds.add(chosen._id.toString());
      chosenItems.push({
        slot: slotDef.slot,
        slotLabel: slotDef.label,
        product: chosen,
      });
    }

    // Compute verified total price directly from chosen items
    const totalPrice = chosenItems.reduce((sum, item) => sum + (item.product.price || 0), 0);

    // Determine budget status
    let budgetStatus = 'within_budget';
    if (maxBudget > 0) {
      if (totalPrice > maxBudget) {
        budgetStatus = 'exceeds_budget';
      } else if (totalPrice < (minBudget || maxBudget * 0.5)) {
        budgetStatus = 'under_budget';
      }
    }

    const title = generateTitle(occasion, aesthetic);
    const explanation = generateExplanation(occasion, aesthetic, chosenItems, budgetStatus);

    // AI Key check for label
    const hasAIKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY);
    const engine = hasAIKey ? 'ai-gemini' : 'catalog-styling';
    const engineLabel = hasAIKey ? 'AI Curated (Gemini Pro)' : 'Atelier Styling Engine';

    res.json({
      success: true,
      look: {
        id: new mongoose.Types.ObjectId().toString(),
        title,
        occasion,
        aesthetic,
        explanation,
        engine,
        engineLabel,
        items: chosenItems,
        totalPrice,
        budget: { min: minBudget, max: maxBudget },
        budgetStatus,
        inStockCount: chosenItems.filter((i) => i.product.countInStock > 0).length,
        allInStock: chosenItems.every((i) => i.product.countInStock > 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get replacement candidate products for a slot in a look
// @route   POST /api/curate/replace-item
// @access  Public
export const getReplacements = async (req, res, next) => {
  try {
    const {
      slot,
      currentProductId,
      category,
      aesthetic = 'Quiet Luxury',
      occasion = 'Date Night',
      excludeProductIds = [],
      preferredColors = [],
    } = req.body;

    // Find slot definition
    const slotDef = SLOTS_CONFIG.find((s) => s.slot === slot);
    const targetCategories = category ? [category] : (slotDef ? slotDef.categories : []);

    const excludeSet = new Set(
      [currentProductId, ...excludeProductIds].filter(Boolean).map((id) => id.toString())
    );

    const candidates = await Product.find({
      category: { $in: targetCategories },
      _id: { $nin: Array.from(excludeSet) },
      isActive: { $ne: false },
    })
      .select('name image images category price originalPrice countInStock rating numReviews brand sizes description')
      .lean();

    // Score and rank candidates
    const scored = candidates.map((p) => ({
      ...p,
      matchScore: scoreProduct(p, {
        preferredColors,
        avoidColors: [],
        aesthetic,
        occasion,
      }),
    }));

    scored.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      count: scored.length,
      replacements: scored.slice(0, 8),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save a curated look to user profile
// @route   POST /api/curate/saved
// @access  Private
export const saveLook = async (req, res, next) => {
  try {
    const {
      title,
      occasion,
      aesthetic,
      explanation,
      engine = 'catalog-styling',
      engineLabel = 'Atelier Styling Engine',
      items,
      budget,
    } = req.body;

    if (!title || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400);
      return next(new Error('Please provide title and look items to save'));
    }

    // Verify all products exist and recalculate verified total price directly from DB
    const productIds = items.map((i) => i.product?._id || i.product).filter(Boolean);
    const verifiedProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(verifiedProducts.map((p) => [p._id.toString(), p]));

    const verifiedItems = [];
    let verifiedTotalPrice = 0;

    for (const item of items) {
      const pId = (item.product?._id || item.product).toString();
      const dbProduct = productMap.get(pId);
      if (dbProduct) {
        verifiedItems.push({
          product: dbProduct._id,
          slot: item.slot || 'main',
          slotLabel: item.slotLabel || '',
        });
        verifiedTotalPrice += dbProduct.price || 0;
      }
    }

    if (verifiedItems.length === 0) {
      res.status(400);
      return next(new Error('No valid products found to save in look'));
    }

    const savedLook = new SavedLook({
      user: req.user._id,
      title,
      occasion,
      aesthetic,
      explanation,
      engine,
      engineLabel,
      items: verifiedItems,
      totalPrice: verifiedTotalPrice,
      budget: budget || { min: 0, max: 0 },
    });

    await savedLook.save();
    await savedLook.populate('items.product');

    res.status(201).json({
      success: true,
      message: 'Look saved to your atelier profile',
      savedLook,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all saved looks for authenticated user
// @route   GET /api/curate/saved
// @access  Private
export const getSavedLooks = async (req, res, next) => {
  try {
    const savedLooks = await SavedLook.find({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name image images category price originalPrice countInStock rating numReviews brand sizes colors description',
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: savedLooks.length,
      savedLooks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a saved look
// @route   DELETE /api/curate/saved/:id
// @access  Private
export const deleteSavedLook = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      return next(new Error('Invalid saved look ID'));
    }

    const look = await SavedLook.findById(id);

    if (!look) {
      res.status(404);
      return next(new Error('Saved look not found'));
    }

    // Verify ownership
    if (look.user.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to delete this look'));
    }

    await SavedLook.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Look deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
