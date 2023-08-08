// server.js

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://127.0.0.1:5173",
        methods: ["GET", "POST", "PUT", "DELETE"],
    },
});

const port = 4000; // Replace with your desired port number

// Replace 'mongodb://localhost:27017' with your MongoDB connection string
const mongoURI = 'mongodb://localhost:27017/realtime-practise';

mongoose.connect(mongoURI).then((res) => {
    console.log("DB Connected :", res.connection.host)
}).catch((err) => {
    console.log(err)
});

const blogPostSchema = new mongoose.Schema({
    title: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

io.on('connection', (socket) => {
    console.log('client connected', socket.id);

    const changeStream = BlogPost.watch();

    changeStream.on('change', (change) => {
        // Send the change data to the connected client
        socket.emit('postChange', change);
    });

    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});

app.use(cors({
    origin: "http://127.0.0.1:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
}))
app.use(express.json());

// Define an API endpoint to handle adding a new blog post
app.post('/api/posts', async (req, res) => {
    try {
        const { title, content } = req.body;

        // Create a new blog post using the Mongoose model
        const newPost = new BlogPost({
            title,
            content,
        });

        // Save the new post to the database
        await newPost.save();

        // Emit the new post to connected clients through socket.io
        io.emit('postChange', {
            operationType: 'insert',
            fullDocument: newPost.toObject(),
        });

        // Respond with the newly created post
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating blog post:', error);
        res.status(500).json({ error: 'Failed to create blog post' });
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await BlogPost.find().sort({ timestamp: -1 });
        res.json(posts);
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
});

app.put('/api/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, content } = req.body;

        const updatedPost = await BlogPost.findByIdAndUpdate(
            postId,
            { title, content },
            { new: true }
        );

        if (!updatedPost) {
            return res.status(404).json({ error: 'Post not found' });
        }

        io.emit('postChange', {
            operationType: 'update',
            documentKey: { _id: postId },
            fullDocument: updatedPost.toObject(),
        });

        res.json(updatedPost);
    } catch (error) {
        console.error('Error updating blog post:', error);
        res.status(500).json({ error: 'Failed to update blog post' });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;

        const deletedPost = await BlogPost.findByIdAndDelete(postId);

        if (!deletedPost) {
            return res.status(404).json({ error: 'Post not found' });
        }

        io.emit('postChange', {
            operationType: 'delete',
            documentKey: { _id: postId },
        });

        res.json(deletedPost);
    } catch (error) {
        console.error('Error deleting blog post:', error);
        res.status(500).json({ error: 'Failed to delete blog post' });
    }
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
