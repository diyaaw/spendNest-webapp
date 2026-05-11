# SpendNest 

SpendNest is an intelligent, full-stack financial intelligence platform. It transforms raw bank statement CSVs into a beautifully visualized, actionable dashboard, helping users master their finances through AI-driven insights and predictive forecasting.

---

## 🚀 What's New? (V2.0)
We've recently upgraded SpendNest into an intelligent platform with the following **AI-Powered Features**:

### 🤖 AI Financial Advisor (Chat)
- A context-aware chatbot that answers questions like *"Can I afford a ₹15,000 expense?"* based on your actual "Safe to Spend" data.
- Answers questions about your financial health, spending history, and savings goals.

### ⚠️ Anomaly Detection
- Automatically flags unusual or suspiciously high transactions (e.g., spending 3x your category average).
- Visual warning badges in your activity list help catch overspending early.

### 📊 Intelligent Budgeting
- Set monthly limits per category and track your progress in real-time.
- Visual warnings when you approach or exceed your target limits.

### ✨ Natural Language Insights
- Plain-English summaries of your financial patterns: *"You spend 40% more on weekends"* or *"Your food expenses have risen 3 months in a row"*.

### 🏦 Multi-Account Support
- Upload CSVs from different banks and tag them by account (HDFC, ICICI, etc.).
- Merges all data into one unified view while maintaining source traceability.

---

## ✨ Core Features
- **Smart CSV Parsing:** Normalizes varied, unstructured bank statement formats into a standardized schema.
- **Auto-Categorization:** Uses keyword-matching to instantly classify transactions (Food, Travel, Salary, etc.).
- **Financial Health Score:** A 0–100 score based on savings rate, spending consistency, and emergency runway.
- **Predictive Forecasting:** Uses ARIMA/SMA models to predict upcoming income trends.
- **Tax Estimator:** Calculates potential tax obligations based on the latest Indian tax regimes.

---

## 🛠️ Tech Stack
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Framer Motion, Recharts.
- **Backend (API):** Node.js, Express, MongoDB (Mongoose).
- **ML Microservice:** Flask, Pandas, NumPy, Statsmodels.
- **State Management:** Zustand.

---

## 🚀 Running Locally

### 1. Requirements
- Node.js 18+
- Python 3.10+
- MongoDB (Atlas or Local)

### 2. Setup the ML Service (FastAPI/Flask)
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
```
*Runs on http://localhost:8000*

### 3. Setup the Backend API (Express)
```bash
cd backend
npm install
# Configure your MONGO_URI in .env
npm run dev
```
*Runs on http://localhost:5000*

### 4. Setup the Frontend (Next.js)
```bash
cd nextjs-frontend
npm install
npm run dev
```
*Runs on http://localhost:3000*

---

## 🧪 Testing the AI
After uploading a bank statement, click the **Robot Icon** in the bottom-right corner to talk to your financial advisor. You can ask:
- *"What is my financial health score?"*
- *"Can I afford a ₹5,000 shopping trip?"*
- *"How much did I spend on Food this month?"*

---

## 🛡️ Audit & Transparency
SpendNest maintains a full **Audit Trail** of every upload and budget change, ensuring your financial data history is secure and traceable.
