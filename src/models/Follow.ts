import mongoose from 'mongoose';

const FollowSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Create a compound index to ensure a user can only follow another user once
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

// Don't create the model if it already exists (for hot reloading)
const Follow = mongoose.models.Follow || mongoose.model('Follow', FollowSchema);

export default Follow; 