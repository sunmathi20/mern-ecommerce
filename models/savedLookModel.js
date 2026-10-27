import mongoose from 'mongoose';

const lookItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    slot: {
      type: String,
      required: true,
      enum: ['main', 'bottom', 'footwear', 'bag', 'accessory'],
    },
    slotLabel: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const savedLookSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    occasion: {
      type: String,
      required: true,
    },
    aesthetic: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
    },
    engine: {
      type: String,
      default: 'catalog-styling',
    },
    engineLabel: {
      type: String,
      default: 'Atelier Styling Engine',
    },
    items: [lookItemSchema],
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    budget: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const SavedLook = mongoose.model('SavedLook', savedLookSchema);
export default SavedLook;
