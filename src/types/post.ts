import { User } from './user';

export interface Comment {
  _id: string;
  user: User | string;
  text: string;
  content?: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  user: User | string;
  caption?: string;
  imageUrl: string;
  imageKey: string;
  likes: string[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
} 