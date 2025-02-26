'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FaRegHeart, FaHeart, FaRegComment, FaTrash, FaEdit } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { getDirectS3Url, getUserAvatarUrl } from '@/lib/image-utils';

interface Comment {
  _id: string;
  user: {
    _id: string;
    name: string;
    username?: string;
    image?: string;
    imageKey?: string;
  } | string;
  text: string;
  content?: string;
  createdAt: string;
}

interface PostUser {
  _id: string;
  name: string;
  username?: string;
  image?: string;
  imageKey?: string;
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
  
  // Ensure user data has fallbacks for missing properties
  const safeUser = {
    _id: post.user?._id || '',
    name: post.user?.name || 'User',
    username: post.user?.username || post.user?.name || 'User',
    image: post.user?.image || '',
    imageKey: post.user?.imageKey || ''
  };

  const currentUserId = session?.user?.id;
  const isOwnPost = currentUserId && safeUser._id === currentUserId;

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
      console.log('Comment API response:', data);
      
      if (!data.comment) {
        throw new Error('No comment data returned from API');
      }
      
      // Make sure the comment has the required fields
      const newCommentData = {
        ...data.comment,
        text: data.comment.text || data.comment.content || newComment, // Fallback chain
      };
      
      console.log('New comment to add to state:', newCommentData);
      
      // Add the new comment to the list
      setComments([...comments, newCommentData]);
      setNewComment('');
      
      // Update the post with the new comment
      onPostUpdate({
        ...post,
        comments: [...post.comments, newCommentData]
      });
    } catch (error: any) {
      setError(error.message || 'Something went wrong');
      console.error('Error adding comment:', error);
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

  // Log comments when component mounts and when they change
  useEffect(() => {
    console.log('FeedPostModal comments changed:', comments);
  }, [comments]);

  // Log initial post prop to check if comments are being passed correctly
  useEffect(() => {
    console.log('FeedPostModal post prop:', post);
    console.log('FeedPostModal post.comments:', post.comments);
  }, [post]);

  // Reset comments when post changes
  useEffect(() => {
    if (post && Array.isArray(post.comments)) {
      console.log('Updating comments state from post:', post.comments);
      setComments(post.comments);
    }
  }, [post, post.comments]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800 p-0 max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Post by {safeUser.username}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col md:flex-row h-full">
          {/* Image */}
          <div className="md:w-3/5 h-[300px] md:h-full relative bg-zinc-950 flex items-center justify-center border-r border-zinc-800">
            <div className="w-full h-full relative">
              <img
                src={post.imageKey ? getDirectS3Url(post.imageKey) : post.imageUrl}
                alt={post.caption || 'Post'}
                className="object-contain w-full h-full"
              />
            </div>
          </div>

          {/* Content */}
          <div className="md:w-2/5 flex flex-col h-full max-h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-zinc-800 flex-shrink-0">
              <Avatar className="w-8 h-8">
                {safeUser.imageKey ? (
                  <AvatarImage src={getDirectS3Url(safeUser.imageKey)} alt={safeUser.name} />
                ) : safeUser.image ? (
                  <AvatarImage src={safeUser.image} alt={safeUser.name} />
                ) : (
                  <AvatarFallback className="bg-zinc-800">
                    {safeUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">{safeUser.username}</p>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {/* Caption */}
              {post.caption && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    {safeUser.imageKey ? (
                      <AvatarImage src={getDirectS3Url(safeUser.imageKey)} alt={safeUser.name} />
                    ) : safeUser.image ? (
                      <AvatarImage src={safeUser.image} alt={safeUser.name} />
                    ) : (
                      <AvatarFallback className="bg-zinc-800">
                        {safeUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{safeUser.username}</span>{' '}
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
                <h3 className="text-sm font-medium text-zinc-400" id="comments-heading">Comments</h3>
                
                {/* Debug logging outside of JSX */}
                
                {comments.length === 0 ? (
                  <p className="text-sm text-zinc-500" aria-labelledby="comments-heading">No comments yet. Be the first to comment!</p>
                ) : (
                  <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent max-h-[280px] space-y-4" role="list" aria-labelledby="comments-heading">
                    {comments.map((comment) => {
                      // Get the comment user safely - handle both string IDs and object references
                      const commentUser = typeof comment.user === 'string'
                        ? { _id: comment.user, name: 'User', image: '', imageKey: '', username: '' }
                        : comment.user || {};
                      
                      // Get user properties safely with fallbacks
                      const commentUserId = typeof commentUser === 'string' ? commentUser : commentUser._id || '';
                      const commentUserName = typeof commentUser === 'string' ? 'User' : commentUser.name || 'User';
                      const commentUserImage = typeof commentUser === 'string' ? '' : commentUser.image || '';
                      const commentUserImageKey = typeof commentUser === 'string' ? '' : commentUser.imageKey || '';
                      const commentUsername = typeof commentUser === 'string' ? 'User' : commentUser.username || commentUser.name || 'User';
                      
                      return (
                        <div key={comment._id} className="flex gap-3" role="listitem">
                          <Avatar className="w-8 h-8">
                            {commentUserImageKey ? (
                              <AvatarImage src={getDirectS3Url(commentUserImageKey)} alt={commentUserName} />
                            ) : commentUserImage ? (
                              <AvatarImage src={commentUserImage} alt={commentUserName} />
                            ) : (
                              <AvatarFallback className="bg-zinc-800">
                                {typeof commentUserName === 'string' ? commentUserName.charAt(0).toUpperCase() : 'U'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="text-sm">
                              <span className="font-medium">{commentUsername}</span>{' '}
                              {comment.text || comment.content || ''}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                              {formatDate(comment.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-zinc-800 flex-shrink-0 bg-zinc-900 sticky bottom-0">
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