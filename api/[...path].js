const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const createToken = (payload) => {
  return jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' });
};

const verifyToken = (token) => {
  return jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
};

let storage = { 
  users: [], 
  products: [], 
  sales: [], 
  expenses: [],
  reminders: [],
  serviceFees: [],
  discounts: [],
  creditRequests: [],
  timeEntries: [],
  settings: {
    lockTimeout: 45000,
    currency: 'KSH',
    companyName: 'Universal POS',
    taxRate: 0
  }
};

const tokenRequired = (handler) => async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token is missing' });
  try {
    req.user = verifyToken(token);
    return handler(req, res);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Token is invalid' });
  }
};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.query.path ? `/${req.query.path.join('/')}` : '/';
  const method = req.method;
  const body = req.body || {};

  try {
    // Auth endpoints (no token required)
    if (path === '/auth/signup' && method === 'POST') {
      if (storage.users.some(u => u.email === body.email)) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      const isFirstUser = storage.users.length === 0;
      
      const user = {
        id: storage.users.length + 1,
        email: body.email,
        password: body.password,
        name: body.name || '',
        role: isFirstUser ? 'admin' : 'cashier',
        plan: isFirstUser ? 'ultra' : null,
        price: isFirstUser ? 1600 : null,
        active: isFirstUser,
        permissions: isFirstUser ? {} : { 
          viewSales: true, 
          viewInventory: true, 
          viewExpenses: false, 
          manageProducts: false 
        },
        createdAt: new Date().toISOString()
      };
      storage.users.push(user);
      const token = createToken({ id: user.id, email: user.email, role: user.role });
      const { password, ...userWithoutPassword } = user;
      return res.status(200).json({ token, user: userWithoutPassword });
    }

    if (path === '/auth/login' && method === 'POST') {
      const user = storage.users.find(u => u.email === body.email);
      if (!user) return res.status(401).json({ error: 'Email not found' });
      
      if (user.needsPasswordSetup && body.newPassword) {
        user.password = body.newPassword;
        user.needsPasswordSetup = false;
        const token = createToken({ id: user.id, email: user.email, role: user.role });
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json({ token, user: userWithoutPassword, firstLogin: true });
      }
      
      if (user.needsPasswordSetup) {
        return res.status(200).json({ needsPasswordSetup: true, userId: user.id, email: user.email, role: user.role });
      }
      
      if (user.password !== body.password) return res.status(401).json({ error: 'Invalid password' });
      const token = createToken({ id: user.id, email: user.email, role: user.role });
      const { password, ...userWithoutPassword } = user;
      return res.status(200).json({ token, user: userWithoutPassword });
    }

    // All other endpoints require authentication
    return tokenRequired(async (req, res) => {
      // Users endpoints
      if (path === '/users' && method === 'GET') {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
        return res.status(200).json(storage.users.map(({ password, ...u }) => u));
      }

      if (path === '/users' && method === 'POST') {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
        const user = { 
          id: storage.users.length + 1, 
          ...body, 
          password: null, 
          needsPasswordSetup: true, 
          role: 'cashier', 
          plan: 'ultra', 
          price: 0, 
          active: true, 
          addedByAdmin: true,
          createdAt: new Date().toISOString() 
        };
        storage.users.push(user);
        const { password, ...userWithoutPassword } = user;
        return res.status(201).json(userWithoutPassword);
      }

      if (path.startsWith('/users/') && method === 'PUT') {
        const id = parseInt(path.split('/')[2]);
        const user = storage.users.find(u => u.id === id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        Object.assign(user, body);
        const token = createToken({ id: user.id, email: user.email, role: user.role });
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json({ token, user: userWithoutPassword });
      }

      if (path.startsWith('/users/') && method === 'DELETE') {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
        storage.users = storage.users.filter(u => u.id !== parseInt(path.split('/')[2]));
        return res.status(204).end();
      }

      // Products, Sales, Expenses, Stats, Settings, Reminders endpoints
      // (keeping it short - add all other endpoints from the Netlify function here)
      
      if (path === '/stats' && method === 'GET') {
        const totalSales = storage.sales.reduce((sum, s) => sum + s.total, 0);
        const totalCOGS = storage.sales.reduce((sum, s) => sum + (s.cogs || 0), 0);
        const totalExpenses = storage.expenses.reduce((sum, e) => sum + e.amount, 0);
        return res.status(200).json({ 
          totalSales, 
          totalCOGS, 
          totalExpenses, 
          grossProfit: totalSales - totalCOGS, 
          netProfit: totalSales - totalCOGS - totalExpenses, 
          salesCount: storage.sales.length, 
          productCount: storage.products.length 
        });
      }

      if (path === '/settings' && method === 'GET') {
        return res.status(200).json(storage.settings);
      }

      if (path === '/reminders/today' && method === 'GET') {
        const today = new Date().toDateString();
        const todayReminders = storage.reminders.filter(r => 
          new Date(r.dueDate).toDateString() === today && !r.completed
        );
        return res.status(200).json(todayReminders);
      }

      return res.status(404).json({ error: 'Not found' });
    })(req, res);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};