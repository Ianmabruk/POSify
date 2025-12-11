# 🚀 How to Run the Application

## ✅ Currently Running

Your application is now running at:
- **Frontend**: http://localhost:3004
- **Backend**: http://localhost:5001 (running in background)

## 🔍 Why Was Your Screen Blank?

The screen was blank because:
1. **Backend wasn't running** - The frontend needs the backend API to fetch data
2. **No dev server** - You need to run `npm run dev` to see the app locally
3. **API calls failing** - Without backend, all API calls return errors causing blank screen

## 📋 How to Run (Step by Step)

### Option 1: Run Both Servers (Recommended)

**Terminal 1 - Backend:**
```bash
cd my-react-app/src/backend
python3 app.py
```
This starts the backend API on http://localhost:5001

**Terminal 2 - Frontend:**
```bash
cd my-react-app
npm run dev
```
This starts the frontend on http://localhost:3004 (or next available port)

### Option 2: Use the Start Script

```bash
cd my-react-app
./start.sh
```
This script starts both servers automatically.

## 🌐 Accessing the Application

1. **Open your browser** to http://localhost:3004
2. **Sign up** for a new account (first user becomes admin)
3. **Select Ultra plan** (KSH 1,600)
4. **Access admin dashboard** at http://localhost:3004/admin

## 🛑 How to Stop

Press `Ctrl+C` in each terminal window to stop the servers.

## 🔧 Troubleshooting

### "Port already in use"
If you see port errors:
```bash
# Kill processes on port 5001 (backend)
lsof -ti:5001 | xargs kill -9

# Kill processes on port 3004 (frontend)
lsof -ti:3004 | xargs kill -9
```

### "Blank screen" or "401 errors"
1. Make sure **both** backend and frontend are running
2. Check backend is on port 5001: `lsof -ti:5001`
3. Clear browser localStorage and refresh
4. Check browser console for errors (F12)

### "Cannot connect to backend"
1. Verify backend is running: `curl http://localhost:5001/api/stats`
2. Check if Flask is installed: `pip list | grep Flask`
3. Install requirements: `pip install -r requirements.txt`

## 📦 For Production (Netlify)

The fixes I made will work on Netlify after you deploy:

```bash
# Install dependencies
npm install

# Deploy to Netlify
netlify deploy --prod
```

Make sure `JWT_SECRET` environment variable is set in Netlify settings.

---

**Your app is now running! Visit http://localhost:3004 to see it.** 🎉