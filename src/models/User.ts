import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
  },
  password: {
    type: String,
  },
  image: {
    type: String,
  },
  imageKey: {
    type: String,
  },
  username: {
    type: String,
    unique: true,
    sparse: true, // Allow null values to be unique
  },
  bio: {
    type: String,
    default: '',
  },
  emailVerified: {
    type: Date,
  },
  accounts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
  ],
  sessions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
  ],
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  const user = this;

  // Only hash the password if it's modified (or new)
  if (!user.isModified('password') || !user.password) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password along with the new salt
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Don't create the model if it already exists (for hot reloading)
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User; 