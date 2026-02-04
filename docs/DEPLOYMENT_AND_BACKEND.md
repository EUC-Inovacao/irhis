# Deployment and Backend Setup Guide

## Local Development Setup

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment** (recommended)
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server**
   ```bash
   python app.py
   ```
   The server will start on `http://localhost:5001` by default.

   **Note**: The backend uses in-memory data structures for development. Data will be reset when the server restarts.

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run Expo**
   ```bash
   npm start
   # or for development client
   npm run start:dev-client
   ```

### API URL Configuration

The frontend automatically detects the development environment and configures the API URL:

- **iOS Simulator**: Uses `http://localhost:5001`
- **Android Emulator**: Uses `http://10.0.2.2:5001` (special IP to access host machine)
- **Physical Device**: Requires manual configuration

#### For Physical Devices

When running on a physical device, you need to set the `EXPO_PUBLIC_API_URL` environment variable to point to your machine's IP address:

1. **Find your machine's IP address**
   - macOS/Linux: Run `ifconfig` or `ip addr`
   - Windows: Run `ipconfig`
   - Look for your local network IP (e.g., `192.168.1.100`)

2. **Set environment variable**
   ```bash
   export EXPO_PUBLIC_API_URL=http://<your-ip-address>:5001
   ```

3. **Start Expo**
   ```bash
   npm start
   ```

   **Note**: Make sure your device and computer are on the same network, and that your firewall allows connections on port 5001.

### Production

In production, the frontend defaults to the Azure backend URL: `https://irhis-api.azurewebsites.net`

You can override this by setting `EXPO_PUBLIC_API_URL` environment variable.

## Backend Endpoints

### Authentication
- `POST /login` - User login
- `POST /signup` - User registration
- `GET /me` - Get current user

### Doctor Endpoints
- `GET /doctors/me/patients` - Get doctor's patients (with search, sort parameters)
- `GET /doctors/me/dashboard` - Get dashboard KPIs
- `GET /doctors/me/latest-feedback` - Get latest feedback entries
- `GET /doctors/me/metrics-summary` - Get latest metrics across patients
- `GET /doctors/me/recent-activity` - Get recent activity (last 7 days)
- `GET /doctors/me/trends` - Get trends data (last 30 days)

### Patient Endpoints
- `GET /patients/<patient_id>` - Get patient details
- `PUT /patients/<patient_id>/details` - Update patient details
- `PUT /patients/<patient_id>/recovery-process` - Update recovery process
- `PUT /patients/<patient_id>/feedback` - Update patient feedback

## Troubleshooting

### Network Error on Login/Signup

If you're getting "Network Error" when trying to login or signup:

1. **Check backend is running**
   - Verify the backend server is running on port 5001
   - Check `http://localhost:5001` in your browser

2. **Check API URL configuration**
   - For iOS Simulator: Should use `http://localhost:5001`
   - For Android Emulator: Should use `http://10.0.2.2:5001`
   - For physical device: Must set `EXPO_PUBLIC_API_URL`

3. **Check network connectivity**
   - Ensure device/emulator can reach the backend
   - Check firewall settings
   - Verify both are on the same network (for physical devices)

### Backend Not Starting

1. **Check Python version**
   ```bash
   python3 --version
   ```
   Should be Python 3.x

2. **Check dependencies**
   ```bash
   pip list
   ```
   Verify all packages from `requirements.txt` are installed

3. **Check port availability**
   - Ensure port 5001 is not in use by another application
   - You can change the port by setting `PORT` environment variable

### Frontend Can't Connect to Backend

1. **Verify backend is accessible**
   - Test `http://localhost:5001` in browser
   - For physical devices, test `http://<your-ip>:5001`

2. **Check CORS settings**
   - Backend has CORS enabled by default
   - If issues persist, check `backend/app.py` CORS configuration

3. **Check environment variables**
   - Verify `EXPO_PUBLIC_API_URL` is set correctly (if needed)
   - Restart Expo after changing environment variables
