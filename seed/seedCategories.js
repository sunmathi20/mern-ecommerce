import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import connectDB from '../config/db.js';

dotenv.config();

const INITIAL_CATEGORIES = [
  { name: 'Watches', slug: 'watches', description: 'Haute horlogerie and curated luxury timepieces.', displayOrder: 1, image: '/assets/products/watches/submariner.svg' },
  { name: 'T-Shirts', slug: 't-shirts', description: 'Heavyweight organic cotton and refined tailoring.', displayOrder: 2, image: '/assets/products/t-shirts/essential-black.svg' },
  { name: 'Hoodies', slug: 'hoodies', description: 'Architectural streetwear silhouettes in custom fleece.', displayOrder: 3, image: '/assets/products/hoodies/oversized-sand.svg' },
  { name: 'Jackets', slug: 'jackets', description: 'Structured outerwear, wool coats, and technical bombers.', displayOrder: 4, image: '/assets/products/jackets/cashmere-overcoat.svg' },
  { name: 'Trousers', slug: 'trousers', description: 'Tailored trousers, pleated wool pants, and wide cuts.', displayOrder: 5, image: '/assets/products/trousers/wool-pleated.svg' },
  { name: 'Dresses', slug: 'dresses', description: 'Evening gowns and contemporary sculptural silhouettes.', displayOrder: 6, image: '/assets/products/dresses/silk-slip.svg' },
  { name: 'Shirts', slug: 'shirts', description: 'Italian cotton poplin, camp collars, and relaxed linen.', displayOrder: 7, image: '/assets/products/shirts/linen-camp.svg' },
  { name: 'Accessories', slug: 'accessories', description: 'Solid brass hardware, leather goods, and fine jewellery.', displayOrder: 8, image: '/assets/products/accessories/leather-belt.svg' },
  { name: 'Bags', slug: 'bags', description: 'Handcrafted leather totes, weekender duffels, and crossbody bags.', displayOrder: 9, image: '/assets/products/bags/leather-tote.svg' },
  { name: 'Footwear', slug: 'footwear', description: 'Italian leather loafers, combat boots, and minimalist runners.', displayOrder: 10, image: '/assets/products/footwear/derby-shoes.svg' },
  { name: 'Sweaters', slug: 'sweaters', description: 'Cashmere knits, ribbed crewnecks, and turtleneck pullovers.', displayOrder: 11, image: '/assets/products/sweaters/midnight.svg' },
];

const seedCategories = async () => {
  try {
    await connectDB();

    for (const cat of INITIAL_CATEGORIES) {
      const exists = await Category.findOne({
        $or: [{ name: cat.name }, { slug: cat.slug }],
      });
      if (!exists) {
        await Category.create(cat);
        console.log(`✓ Seeded category: ${cat.name}`);
      } else {
        console.log(`- Category already exists: ${cat.name}`);
      }
    }

    console.log('\n✓ Category seeding completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('✗ Category seeding error:', error);
    process.exit(1);
  }
};

seedCategories();
