import mongoose from 'mongoose';
import config from './src/app/config'; // assuming config exists
import { BannerSlot } from './src/app/modules/Banner/banner.model';
import dotenv from 'dotenv';
dotenv.config();

const dropIndex = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL as string);
    console.log('Connected to DB');
    
    await BannerSlot.collection.dropIndex('slotType_1');
    console.log('Index slotType_1 dropped successfully!');
    
  } catch (err: any) {
    if (err.codeName === 'IndexNotFound') {
      console.log('Index slotType_1 already dropped or not found.');
    } else {
      console.error('Error dropping index:', err.message);
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
};

dropIndex();
