/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  User as UserIcon,
  Trash2,
  Clock,
  Plus,
  X
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { User, Comment } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CommentsProps {
  user: User;
}

export default function Comments({ user }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    const commentsQuery = query(collection(db, 'comments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(commentsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'comments'));

    return () => unsubscribe();
  }, []);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentData = {
      userId: user.id,
      username: user.username,
      depot: user.depot || 'JPG-JNN',
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'comments'), commentData);
      setNewComment('');
      setIsFormVisible(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'comments');
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'comments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comments/${id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Staff Comments</h2>
          <p className="text-zinc-500 mt-1">Share notes, updates, or general feedback with the team.</p>
        </div>
        
        {!isFormVisible && (
          <button 
            onClick={() => setIsFormVisible(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
          >
            <Plus className="w-5 h-5" />
            Post Comment
          </button>
        )}
      </header>

      {/* Post Comment */}
      {isFormVisible && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">New Comment</h3>
            <button onClick={() => setIsFormVisible(false)} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handlePostComment} className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <UserIcon className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 px-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 min-h-[120px] resize-none transition-all"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
              >
                <Send className="w-4 h-4" />
                Submit Comment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <UserIcon className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-zinc-100">{comment.username}</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {comment.depot}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mb-4">
                    <Clock className="w-3 h-3" />
                    {new Date(comment.createdAt).toLocaleString()}
                  </div>
                  <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {comment.text}
                  </p>
                </div>
              </div>

              {(user.role === 'admin' || user.id === comment.userId) && (
                <button 
                  onClick={() => handleDeleteComment(comment.id)}
                  className="p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="py-20 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
            <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">No comments yet. Start the conversation!</p>
          </div>
        )}
      </div>
    </div>
  );
}
