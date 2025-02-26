'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FaRegHeart, FaHeart, FaRegComment, FaTrash, FaEdit } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  _id: string;
  user: {
    _id: string;
    name: string;
    username?: string;
    image?: string;
  };
  text: string;
  createdAt: string;
}

interface PostUser {
  _id: string;
  name: string;
  username?: string;
  image?: string;
}

interface Post {
  _id: string;
  user: PostUser;
  caption?: string;
  imageUrl: string;
  imageKey: string;
  likes: string[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

interface FeedPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onPostUpdate: (updatedPost: Post) => void;
}

export function FeedPostModal({ isOpen, onClose, post, onPostUpdate }: FeedPostModalProps) {
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes.length);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Comment[]>(post.comments);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  
  const currentUserId = session?.user?.id;
  const isOwnPost = currentUserId && post.user._id === currentUserId;

  // Check if the post is liked by the current user
  useEffect(() => {
    if (currentUserId) {
      setIsLiked(post.likes.includes(currentUserId));
    }
  }, [post.likes, currentUserId]);

  const handleLike = async () => {
    if (!currentUserId) return;
    
    try {
      const response = await fetch(`/api/posts/${post._id}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      const data = await response.json();
      setIsLiked(data.liked);
      setLikesCount(data.likesCount);
      
      // Update the post with new likes
      onPostUpdate({
        ...post,
        likes: data.liked 
          ? [...post.likes, currentUserId] 
          : post.likes.filter(id => id !== currentUserId)
      });
    } catch (error: any) {
      console.error('Error liking post:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUserId) return;
    
    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch(`/api/posts/${post._id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newComment }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add comment');
      }

      const data = await response.json();
      
      // Add the new comment to the list
      setComments([...comments, data.comment]);
      setNewComment('');
      
      // Update the post with the new comment
      onPostUpdate({
        ...post,
        comments: [...post.comments, data.comment]
      });
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

  const focusCommentInput = () => {
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800 p-0 max-w-4xl h-[80vh] max-h-[800px] overflow-hidden">
        <div className="flex flex-col md:flex-row h-full">
          {/* Image */}
          <div className="md:w-3/5 h-[300px] md:h-full relative bg-zinc-950 flex items-center justify-center border-r border-zinc-800">
            <div className="w-full h-full relative">
              <img
                src={post.imageUrl}
                alt={post.caption || 'Post'}
                className="object-contain w-full h-full"
              />
            </div>
          </div>

          {/* Content */}
          <div className="md:w-2/5 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.user.image || ''} alt={post.user.name} />
                <AvatarFallback className="bg-zinc-800">
                  {post.user.name ? post.user.name.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">{post.user.username || post.user.name}</p>
              </div>
              
              {/* Only show edit/delete buttons if it's the user's own post */}
              {isOwnPost && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="!outline-none !border-none"
                    onClick={() => window.location.href = `/profile`}
                  >
                    <FaEdit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="!outline-none !border-none"
                    onClick={() => window.location.href = `/profile`}
                  >
                    <FaTrash className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Caption and Comments */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Caption */}
              {post.caption && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={post.user.image || ''} alt={post.user.name} />
                    <AvatarFallback className="bg-zinc-800">
                      {post.user.name ? post.user.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{post.user.username || post.user.name}</span>{' '}
                      {post.caption}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="space-y-4 mt-6">
                <h3 className="text-sm font-medium text-zinc-400">Comments</h3>
                
                {comments.length === 0 ? (
                  <p className="text-sm text-zinc-500">No comments yet. Be the first to comment!</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment._id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.user.image || ''} alt={comment.user.name} />
                          <AvatarFallback className="bg-zinc-800">
                            {comment.user.name ? comment.user.name.charAt(0).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">{comment.user.username || comment.user.name}</span>{' '}
                            {comment.text}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {formatDate(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-zinc-800">
              <div className="flex items-center p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-zinc-800 flex gap-2"
                  onClick={handleLike}
                >
                  {isLiked ? (
                    <FaHeart className="w-5 h-5 text-red-500" />
                  ) : (
                    <FaRegHeart className="w-5 h-5" />
                  )}
                  {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-zinc-800 flex gap-2 ml-2"
                  onClick={focusCommentInput}
                >
                  <FaRegComment className="w-5 h-5" />
                  Comment
                </Button>
              </div>

              {/* Add comment */}
              <div className="p-4 pt-0">
                {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
                <div className="flex gap-2">
                  <Textarea
                    ref={commentInputRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="bg-zinc-800 border-zinc-700 text-white resize-none min-h-[60px]"
                  />
                  <Button
                    className="self-end bg-zinc-800 hover:bg-zinc-700"
                    onClick={handleAddComment}
                    disabled={isSubmitting || !newComment.trim()}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Post'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 