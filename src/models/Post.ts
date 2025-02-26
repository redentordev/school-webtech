import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 2200
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  imageKey: {
    type: String,
    required: [true, 'Image key is required for S3']
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Don't create the model if it already exists (for hot reloading)
const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

export default Post; 