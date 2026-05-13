# SpendNest 

SpendNest is an intelligent, full-stack financial intelligence platform designed for freelancers and independent contractors. It transforms raw bank statement CSVs into a beautifully visualized, actionable dashboard, helping users master their finances through AI-driven insights, predictive forecasting, and a premium "white-base" SaaS aesthetic.

---

## 🚀 What's New? (V2.5)
We've recently upgraded SpendNest into an elite financial co-pilot with the following **Premium Features**:

### 🎨 Premium "White-Base" UI Overhaul
- **Elite SaaS Aesthetic**: Transitioned the entire dashboard and onboarding flow to a sophisticated light-mode theme (Slate & Indigo).
- **Glassmorphism & Micro-animations**: Implemented tactile hover states, staggered animations, and a responsive, non-scrolling dashboard shell for a professional app feel.
- **Improved Readability**: Focused on high-contrast typography and clean spacing to reduce financial anxiety.

### 🔄 Unified Onboarding Experience
- **Seamless Flow**: Account creation is now directly integrated with the financial profiling wizard.
- **Zero Redundancy**: Intelligent profile setup that remembers your registration details, getting you to your dashboard in under 2 minutes.

### 🇮🇳 India-First Tax Engine
- **Automated Tax Reserves**: Automatically calculates GST and Income Tax liabilities based on current Indian tax regimes (Old vs New).
- **Smart Reminders**: Integrated alerts for advance tax deadlines and GST filing dates.

### 🤖 AI Financial Advisor (Chat)
- **Context-Aware Insights**: A chatbot that answers questions like *"Can I afford a ₹15,000 expense?"* based on your actual "Safe to Spend" data.
- **Anomaly Detection**: Automatically flags unusual or suspiciously high transactions.

---

## ✨ Core Features
- **Smart CSV Parsing:** Normalizes varied, unstructured bank statement formats into a standardized schema.
- **Auto-Categorization:** Uses keyword-matching to instantly classify transactions (Food, Travel, Salary, etc.).
- **Financial Health Score:** A 0–100 score based on savings rate, spending consistency, and emergency runway.
- **Predictive Forecasting:** Uses ML models to predict upcoming income trends and cash-flow gaps.
- **Safety Net Planning:** Built-in emergency fund tracker and income smoothing suggestions.

---

## 🛠️ Tech Stack
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Framer Motion, Recharts.
- **Backend (API):** Node.js, Express, MongoDB.
- **ML Microservice:** Python (Flask/FastAPI), Pandas, NumPy, Statsmodels.
- **State Management:** Zustand.

---

## 🚀 Running Locally

### 1. Requirements
- Node.js 18+
- Python 3.10+
- MongoDB (Atlas or Local)

### 2. Setup the ML Service
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
```
*Runs on http://localhost:8000*

### 3. Setup the Backend API
```bash
cd backend
npm install
# Configure your MONGO_URI in .env
npm run dev
```
*Runs on http://localhost:5000*

### 4. Setup the Frontend
```bash
cd nextjs-frontend
npm install
npm run dev
```
*Runs on http://localhost:3000*

---

## 🛡️ Audit & Transparency
SpendNest maintains a full **Audit Trail** of every upload and budget change, ensuring your financial data history is secure and traceable. All processing is done securely with SOC 2 compliance standards in mind.
