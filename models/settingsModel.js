import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'AURELIA',
    },
    tagline: {
      type: String,
      default: 'Luxury, Curated Around You',
    },
    supportEmail: {
      type: String,
      default: 'concierge@aurelia.com',
    },
    supportPhone: {
      type: String,
      default: '+91 (0) 22 8900 1200',
    },
    freeShippingThreshold: {
      type: Number,
      default: 10000,
    },
    standardShippingFee: {
      type: Number,
      default: 500,
    },
    taxRate: {
      type: Number,
      default: 18,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    enableCod: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
