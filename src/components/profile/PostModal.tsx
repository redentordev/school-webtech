'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FaRegHeart, FaHeart, FaTrash, FaEdit } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';
import { Post } from '@/types/post';
import { User } from '@/types/user';
import { formatDistanceToNow } from 'date-fns';
import { S3Image } from '@/components/S3Image';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onPostUpdate: (updatedPost: Post) => void;
  onPostDelete: (postId: string) => void;
}

// Define a more specific type for the user object
interface UserDisplay {
  name: string;
  image?: string;
  username?: string;
}

export function PostModal({ isOpen, onClose, post, onPostUpdate, onPostDelete }: PostModalProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Get user info from post with proper type handling
  const user: UserDisplay = typeof post.user === 'object' 
    ? post.user as User 
    : { name: 'User', image: '' };

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/posts/${post._id}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      const data = await response.json();
      setIsLiked(data.liked);
      
      // Update the post with new likes count
      onPostUpdate({
        ...post,
        likes: data.liked 
          ? [...post.likes, 'current-user-id'] 
          : post.likes.filter(id => id !== 'current-user-id')
      });
    } catch (error: any) {
      console.error('Error liking post:', error);
    }
  };

  const handleUpdateCaption = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch(`/api/posts/${post._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caption }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update post');
      }

      const data = await response.json();
      onPostUpdate({
        ...post,
        caption,
      });
      setIsEditing(false);
    } catch (error: any) {
      setError(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch(`/api/posts/${post._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete post');
      }

      onPostDelete(post._id);
    } catch (error: any) {
      setError(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'some time ago';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800 p-0 max-w-4xl h-[80vh] max-h-[800px] overflow-hidden">
        <div className="flex flex-col md:flex-row h-full">
          {/* Image */}
          <div className="md:w-3/5 h-[300px] md:h-full relative bg-zinc-950 flex items-center justify-center border-r border-zinc-800">
            <div className="w-full h-full relative">
              <S3Image
                imageKey={post.imageKey}
                alt={post.caption || 'Post'}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 60vw"
                showLoadingSpinner={true}
              />
            </div>
          </div>

          {/* Content */}
          <div className="md:w-2/5 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.image || ''} alt={user.name} />
                <AvatarFallback className="bg-zinc-800">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">{user.username || user.name}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="!outline-none !border-none"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <FaEdit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="!outline-none !border-none"
                  onClick={handleDeletePost}
                  disabled={isSubmitting}
                >
                  <FaTrash className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Caption and Comments */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    className="bg-zinc-800 border-zinc-700 text-white resize-none h-24"
                  />
                  {error && <div className="text-red-500 text-sm">{error}</div>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setCaption(post.caption || '');
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-zinc-800 text-white hover:bg-zinc-700"
                      onClick={handleUpdateCaption}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {post.caption && (
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.image || ''} alt={user.name} />
                        <AvatarFallback className="bg-zinc-800">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{user.username || user.name}</span>{' '}
                          {post.caption}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center p-4 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-zinc-800 flex gap-2"
                onClick={handleLike}
              >
                {isLiked ? (
                  <FaHeart className="w-4 h-4 text-white" />
                ) : (
                  <FaRegHeart className="w-4 h-4" />
                )}
                {post.likes?.length || 0} likes
              </Button>
              <span className="text-xs text-zinc-500">
                {formatDate(post.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 