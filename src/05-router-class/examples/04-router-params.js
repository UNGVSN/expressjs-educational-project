/**
 * Example 04: Router Parameters
 *
 * Demonstrates router.param() for preprocessing route parameters.
 *
 * Run: npm run example:params
 */

'use strict';

const createApp = require('../lib');
const Router = require('../lib/router');

const app = createApp();

// ============================================
// SIMULATED DATABASE
// ============================================

const database = {
  users: {
    '1': { id: 1, name: 'Alice', role: 'admin' },
    '2': { id: 2, name: 'Bob', role: 'user' },
    '3': { id: 3, name: 'Charlie', role: 'user' }
  },
  posts: {
    '1': { id: 1, title: 'Hello World', authorId: 1 },
    '2': { id: 2, title: 'Express Tips', authorId: 1 },
    '3': { id: 3, title: 'Node.js Guide', authorId: 2 }
  },
  comments: {
    '1': { id: 1, postId: 1, text: 'Great post!', userId: 2 },
    '2': { id: 2, postId: 1, text: 'Thanks!', userId: 1 }
  }
};

// ============================================
// USERS ROUTER WITH PARAM HANDLER
// ============================================

const usersRouter = new Router();

/**
 * router.param('userId', callback)
 *
 * This callback runs BEFORE any route handler that has :userId
 * It's perfect for:
 * - Loading resources from database
 * - Validating parameters
 * - Transforming values
 */
usersRouter.param('userId', (req, res, next, userId) => {
  console.log(`[Param Handler] Loading user: ${userId}`);

  // Look up user in database
  const user = database.users[userId];

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      userId: userId
    });
  }

  // Attach user to request
  req.user = user;
  next();
});

// Routes that use :userId will have req.user already set
usersRouter.get('/:userId', (req, res) => {
  // req.user is already available!
  res.json({
    message: 'User loaded by param handler',
    user: req.user
  });
});

usersRouter.get('/:userId/posts', (req, res) => {
  // Find posts by this user
  const userPosts = Object.values(database.posts)
    .filter(post => post.authorId === req.user.id);

  res.json({
    user: req.user.name,
    posts: userPosts
  });
});

// ============================================
// POSTS ROUTER WITH MULTIPLE PARAMS
// ============================================

const postsRouter = new Router();

// Post param handler
postsRouter.param('postId', (req, res, next, postId) => {
  const post = database.posts[postId];

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  req.post = post;

  // Also load the author
  req.post.author = database.users[post.authorId];

  next();
});

// Comment param handler
postsRouter.param('commentId', (req, res, next, commentId) => {
  const comment = database.comments[commentId];

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  // Verify comment belongs to post
  if (req.post && comment.postId !== req.post.id) {
    return res.status(404).json({ error: 'Comment not found on this post' });
  }

  req.comment = comment;
  req.comment.user = database.users[comment.userId];

  next();
});

postsRouter.get('/:postId', (req, res) => {
  res.json({ post: req.post });
});

postsRouter.get('/:postId/comments', (req, res) => {
  const postComments = Object.values(database.comments)
    .filter(c => c.postId === req.post.id)
    .map(c => ({
      ...c,
      user: database.users[c.userId]?.name
    }));

  res.json({
    post: req.post.title,
    comments: postComments
  });
});

postsRouter.get('/:postId/comments/:commentId', (req, res) => {
  res.json({
    post: req.post,
    comment: req.comment
  });
});

// ============================================
// VALIDATION PARAM HANDLER
// ============================================

const validationRouter = new Router();

// Param handler that validates and transforms
validationRouter.param('id', (req, res, next, id) => {
  // Validate it's a number
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId < 1) {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'ID must be a positive integer',
      received: id
    });
  }

  // Transform to number
  req.params.id = numId;
  next();
});

validationRouter.get('/items/:id', (req, res) => {
  res.json({
    id: req.params.id,
    type: typeof req.params.id,
    message: 'ID was validated and converted to number'
  });
});

// ============================================
// MOUNT ROUTERS
// ============================================

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Router Parameters</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .section { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
    .error { color: #f44336; }
  </style>
</head>
<body>
  <h1>Router Parameter Handlers</h1>

  <div class="section">
    <h3>How router.param() Works</h3>
    <pre><code>router.param('userId', (req, res, next, userId) => {
  // Load user from database
  const user = database.findUser(userId);

  if (!user) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Attach to request
  req.user = user;
  next();
});

router.get('/:userId', (req, res) => {
  // req.user is already loaded!
  res.json(req.user);
});</code></pre>
  </div>

  <div class="section">
    <h3>Users Router (with :userId param)</h3>
    <ul>
      <li><a href="/users/1">/users/1</a> - Get user 1 (Alice)</li>
      <li><a href="/users/2">/users/2</a> - Get user 2 (Bob)</li>
      <li><a href="/users/999">/users/999</a> - <span class="error">Not found</span></li>
      <li><a href="/users/1/posts">/users/1/posts</a> - User's posts</li>
    </ul>
  </div>

  <div class="section">
    <h3>Posts Router (with :postId and :commentId)</h3>
    <ul>
      <li><a href="/posts/1">/posts/1</a> - Get post with author</li>
      <li><a href="/posts/1/comments">/posts/1/comments</a> - Post comments</li>
      <li><a href="/posts/1/comments/1">/posts/1/comments/1</a> - Specific comment</li>
    </ul>
  </div>

  <div class="section">
    <h3>Validation Router (validates :id)</h3>
    <ul>
      <li><a href="/validate/items/42">/validate/items/42</a> - Valid ID</li>
      <li><a href="/validate/items/abc">/validate/items/abc</a> - <span class="error">Invalid</span></li>
      <li><a href="/validate/items/-5">/validate/items/-5</a> - <span class="error">Invalid</span></li>
    </ul>
  </div>
</body>
</html>
  `);
});

app.use('/users', usersRouter);
app.use('/posts', postsRouter);
app.use('/validate', validationRouter);

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Router Parameters Example                                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Param Handlers Demo:                                            ║
║   /users/:userId       - Loads user by ID                         ║
║   /posts/:postId       - Loads post with author                   ║
║   /validate/items/:id  - Validates numeric ID                     ║
║                                                                   ║
║   Watch the console for param handler logs!                       ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
