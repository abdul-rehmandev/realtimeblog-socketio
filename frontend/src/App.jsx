// src/App.js

import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const App = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '' });

  useEffect(() => {
    const socket = io('http://localhost:4000'); // Replace with your server URL

    // Function to update the state with new blog posts
    const updatePosts = (change) => {
      if (change.operationType === 'insert') {
        setPosts((prevPosts) => [...prevPosts, change.fullDocument]);
      } else if (change.operationType === 'update') {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post._id === change.documentKey._id ? change.fullDocument : post
          )
        );
      } else if (change.operationType === 'delete') {
        setPosts((prevPosts) =>
          prevPosts.filter((post) => post._id !== change.documentKey._id)
        );
      }
    };

    socket.on('postChange', updatePosts);

    return () => {
      socket.disconnect(); // Clean up the socket connection when the component unmounts
    };
  }, []);

  useEffect(() => {
    // Fetch initial blog posts from the backend using Mongoose
    const fetchPosts = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/posts'); // Replace with your backend API endpoint
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      }
    };

    fetchPosts();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewPost((prevPost) => ({ ...prevPost, [name]: value }));
  };

  const handleAddPost = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPost),
      });

      const data = await response.json();
      console.log('New blog post created:', data);

      // Clear the input fields after successful post creation
      setNewPost({ title: '', content: '' });
    } catch (error) {
      console.error('Error creating blog post:', error);
    }
  };

  const handleUpdatePost = async (postId, updatedData) => {
    try {
      const response = await fetch(`http://localhost:4000/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      const updatedPost = await response.json();
      console.log('Updated blog post:', updatedPost);
    } catch (error) {
      console.error('Error updating blog post:', error);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/posts/${postId}`, {
        method: 'DELETE',
      });

      const deletedPost = await response.json();
      console.log('Deleted blog post:', deletedPost);
    } catch (error) {
      console.error('Error deleting blog post:', error);
    }
  };

  return (
    <div>
      <h1>Real-time Blog Posts</h1>
      {posts.map((post) => (
        <div key={post._id}>
          <h3>{post.title}</h3>
          <p>{post.content}</p>
          <button onClick={() => handleUpdatePost(post._id, { title: 'Updated Title', content: 'Updated Content' })}>
            Update Post
          </button>
          <button onClick={() => handleDeletePost(post._id)}>Delete Post</button>
          <hr />
        </div>
      ))}
      <div>
        <h2>Add New Post</h2>
        <input
          type="text"
          name="title"
          value={newPost.title}
          onChange={handleInputChange}
          placeholder="Title"
        />
        <textarea
          name="content"
          value={newPost.content}
          onChange={handleInputChange}
          placeholder="Content"
        />
        <button onClick={handleAddPost}>Add Post</button>
      </div>
    </div>
  );
};

export default App;
