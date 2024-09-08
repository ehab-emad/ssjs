const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // مكتبة Multer لرفع الملفات
const cloudinary = require('cloudinary').v2; // مكتبة Cloudinary

const app = express();
const port = process.env.PORT || 3000;

// إعدادات Cloudinary
cloudinary.config({
  cloud_name: 'dxtbsifqn',
  api_key: '554486421733863',
  api_secret: 'B_wv1i5_3Jyi-ILLVYZhZrgvym8'
});

// إعداد Multer لرفع الملفات
const storage = multer.memoryStorage();
const upload = multer({ storage });

// الاتصال بـ MongoDB
mongoose.connect('mongodb://localhost:27017/storeDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// تعريف مخطط المنتج
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  type: String,
  size: String,
  description: String,
  imageUrl: String // رابط الصورة
});

// نموذج المنتج
const Product = mongoose.model('Product', productSchema);

// تعريف مخطط المستخدم
const userSchema = new mongoose.Schema({
  username: String,
  visits: [Date],
});

// نموذج المستخدم
const User = mongoose.model('User', userSchema);

// تعريف مخطط الزيارات
const visitSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
});

const Visit = mongoose.model('Visit', visitSchema);

// إعدادات Express
app.use(cors());
app.use(express.json());

// تسجيل كل زيارة
app.use(async (req, res, next) => {
  try {
    await new Visit().save();
  } catch (error) {
    console.error('Error saving visit:', error);
  }
  next();
});

// إضافة منتج جديد مع صورة
app.post('/products', upload.single('image'), async (req, res) => {
  const { name, price, type, size, description } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Please upload an image' });
  }

  try {
    // رفع الصورة إلى Cloudinary
    const result = await cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
      if (error) {
        return res.status(500).json({ error: 'Error uploading image to Cloudinary' });
      }
      return result;
    }).end(req.file.buffer);

    // حفظ بيانات المنتج في MongoDB
    const newProduct = new Product({
      name,
      price,
      type,
      size,
      description,
      imageUrl: result.secure_url // رابط الصورة
    });
    await newProduct.save();

    res.status(201).json({ message: 'Product added successfully', product: newProduct });
  } catch (error) {
    res.status(500).json({ error: 'Error adding product' });
  }
});

// حذف منتج
app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByIdAndDelete(id);
    if (product && product.imageUrl) {
      // حذف الصورة من Cloudinary
      await cloudinary.uploader.destroy(product.imageUrl.split('/').pop().split('.')[0]);
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// تعديل منتج
app.put('/products/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, price, type, size, description } = req.body;

  try {
    const updatedProduct = await Product.findById(id);
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // إذا كانت الصورة مرفقة، قم برفعها إلى Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
        if (error) {
          return res.status(500).json({ error: 'Error uploading image to Cloudinary' });
        }
        return result;
      }).end(req.file.buffer);

      updatedProduct.imageUrl = result.secure_url; // تحديث رابط الصورة
    }

    // تحديث بيانات المنتج
    updatedProduct.name = name || updatedProduct.name;
    updatedProduct.price = price || updatedProduct.price;
    updatedProduct.type = type || updatedProduct.type;
    updatedProduct.size = size || updatedProduct.size;
    updatedProduct.description = description || updatedProduct.description;

    await updatedProduct.save();
    res.json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    res.status(500).json({ error: 'Error updating product' });
  }
});

// الحصول على عدد الزيارات
app.get('/stats/visits', async (req, res) => {
  try {
    const visitCount = await Visit.countDocuments();
    res.json({ visitCount });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching visit count' });
  }
});

// تسجيل مستخدم جديد
app.post('/register', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const newUser = new User({ username, visits: [new Date()] });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

// تسجيل دخول المستخدم وتحديث تاريخ الزيارة
app.post('/login', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.visits.push(new Date());
    await user.save();
    res.json({ message: 'User logged in successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in user' });
  }
});

// الحصول على عدد المستخدمين
app.get('/stats/users', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({ userCount });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user count' });
  }
});

// بدء تشغيل الخادم
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
