'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Dialog, 
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FaRegHeart, FaHeart, FaTrash, FaEdit, FaRegComment } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';
import { Post, Comment } from '@/types/post';
import { User } from '@/types/user';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { getDirectS3Url, getUserAvatarUrl } from '@/lib/image-utils';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onPostUpdate: (updatedPost: Post) => void;
  onPostDelete: (postId: string) => void;
  isProfilePage?: boolean;
}

export function PostModal({ isOpen, onClose, post, onPostUpdate, onPostDelete, isProfilePage = false }: PostModalProps) {
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const currentUserId = session?.user?.id || '';
  const currentUserEmail = session?.user?.email || '';
  const postUserId = typeof post.user === 'string' ? post.user : post.user?._id || '';
  const postUserEmail = typeof post.user === 'string' ? '' : post.user?.email || '';
  
  // Enhanced check for post ownership with additional fallbacks
  // For profile page, always consider posts as owned by current user
  const isOwnPost = isProfilePage || 
    (currentUserId && ((postUserId === currentUserId) || 
                      (post.user && typeof post.user === 'object' && post.user._id === currentUserId))) || 
    (currentUserEmail && postUserEmail && currentUserEmail === postUserEmail);

  // Force visible for debugging (uncomment if needed to force visibility)
  // const isOwnPost = true;
                   
  // Debug logs with more detailed information
  useEffect(() => {
    console.log('PostModal - Current User ID:', currentUserId);
    console.log('PostModal - Post User ID:', postUserId);
    console.log('PostModal - Post User Raw:', post.user);
    console.log('PostModal - Current User Email:', currentUserEmail);
    console.log('PostModal - Post User Email:', postUserEmail);
    console.log('PostModal - Is Profile Page:', isProfilePage);
    console.log('PostModal - Session Data:', session);
    console.log('PostModal - Is Own Post:', isOwnPost);
  }, [currentUserId, postUserId, currentUserEmail, postUserEmail, isOwnPost, post.user, session, isProfilePage]);
  
  // Check if the current user has liked the post
  useEffect(() => {
    if (currentUserId && post.likes) {
      setIsLiked(post.likes.includes(currentUserId));
      setLikesCount(post.likes.length);
    }
  }, [currentUserId, post.likes]);
  
  // Reset comments when post changes
  useEffect(() => {
    if (post && Array.isArray(post.comments)) {
      console.log('Updating comments state from post:', post.comments);
      setComments(post.comments);
    }
  }, [post, post.comments]);
  
  // Log comments when they change
  useEffect(() => {
    console.log('PostModal comments changed:', comments);
  }, [comments]);

  // Create safeUser with fallbacks
  const safeUser = {
    _id: typeof post.user === 'string' ? post.user : post.user?._id || '',
    name: typeof post.user === 'string' ? 'User' : post.user?.name || 'User',
    username: typeof post.user === 'string' ? 'User' : post.user?.username || post.user?.name || 'User',
    image: typeof post.user === 'string' ? '' : post.user?.image || '',
    imageKey: typeof post.user === 'string' ? '' : post.user?.imageKey || '',
    email: typeof post.user === 'string' ? '' : post.user?.email || ''
  };

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

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error: unknown) {
      return 'some time ago';
    }
  };

  const focusCommentInput = () => {
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close the modal on escape key press
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-zinc-900 text-white border-zinc-800 p-0 max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">
          {post.caption || 'Post details'}
        </DialogTitle>
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </DialogClose>
        <div className="flex flex-col md:flex-row h-full">
          {/* Image */}
          <div className="md:w-3/5 h-[300px] md:h-full relative bg-zinc-950 flex items-center justify-center border-r border-zinc-800">
            <div className="w-full h-full relative">
              <Image
                src={getDirectS3Url(post.imageKey)}
                alt={post.caption || 'Post image'}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 60vw"
                priority
              />
            </div>
          </div>

          {/* Content */}
          <div className="md:w-2/5 flex flex-col h-full max-h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-zinc-800 flex-shrink-0">
              <Avatar className="w-8 h-8">
                {safeUser.imageKey ? (
                  <AvatarImage src={getDirectS3Url(safeUser.imageKey)} alt={`${safeUser.name}'s profile picture`} />
                ) : safeUser.image ? (
                  <AvatarImage src={safeUser.image} alt={`${safeUser.name}'s profile picture`} />
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
                    onClick={() => setIsEditing(!isEditing)}
                    aria-label="Edit post caption"
                  >
                    <FaEdit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="!outline-none !border-none"
                    onClick={handleDeletePost}
                    disabled={isSubmitting}
                    aria-label="Delete post"
                  >
                    <FaTrash className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Caption and Comments */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    className="bg-zinc-800 border-zinc-700 text-white resize-none h-24"
                    aria-label="Post caption"
                    id="post-caption"
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
                          const commentUserName = typeof commentUser === 'string' ? "User" : commentUser.name || 'User';
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
                </>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-zinc-800 flex-shrink-0 bg-zinc-900 sticky bottom-0">
              <div className="flex items-center p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-zinc-800 flex gap-2"
                  onClick={handleLike}
                  aria-label={isLiked ? "Unlike post" : "Like post"}
                  aria-pressed={isLiked}
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
                  aria-label="Add a comment"
                >
                  <FaRegComment className="w-5 h-5" />
                  Comment
                </Button>
              </div>

              {/* Add comment */}
              <div className="p-4 pt-0">
                {error && <div className="text-red-500 text-sm mb-2" aria-live="assertive">{error}</div>}
                <label htmlFor="comment-input" className="sr-only">Add a comment</label>
                <div className="flex gap-2">
                  <Textarea
                    ref={commentInputRef}
                    id="comment-input"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="bg-zinc-800 border-zinc-700 text-white resize-none min-h-[60px]"
                  />
                  <Button
                    className="self-end bg-zinc-800 hover:bg-zinc-700"
                    onClick={handleAddComment}
                    disabled={isSubmitting || !newComment.trim()}
                    aria-label="Post comment"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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