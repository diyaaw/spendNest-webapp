# FlowShield 🛡️

FlowShield is an intelligent, full-stack personal finance analytics engine. It transforms raw, messy bank statement CSVs into a beautifully visualized, actionable financial dashboard in milliseconds. 

Built for speed and simplicity, FlowShield automatically categorizes transactions, forecasts future income using moving averages, and recommends a "safe-to-spend" balance to help users master their finances.

## ✨ Key Features
- **Smart CSV Parsing:** Uses Pandas to normalize varied, unstructured bank statement formats into a standardized schema.
- **Auto-Categorization:** Uses keyword-matching algorithms to instantly classify transactions (Food, Travel, Salary, etc.).
- **Predictive Forecasting:** Calculates a 3-month Simple Moving Average (SMA) to predict upcoming income without complex ML overhead.
- **Actionable Insights:** Dynamically recommends reserve funds and a safe-to-spend balance based on your unique financial trends.
- **Stunning UI:** A responsive, premium dark-mode dashboard built with Tailwind CSS and Recharts.

## 🛠️ Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, Recharts
- **Backend:** FastAPI, Python, Pandas
- **Architecture:** Modular REST APIs with In-memory DataFrame processing.

## 🚀 Run Locally

### 1. Start the FastAPI Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
*The backend will run on http://localhost:8000. Interactive API docs at `/docs`.*

### 2. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
```
*The frontend will run on http://localhost:5173.*
