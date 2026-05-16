# Neuro-Heal 🧠

> **Premium Mental Health Portal with AI-Powered Support**  
> A modern web application combining professional mental health resources with intelligent AI chatbot assistance powered by Google's Gemini 2.0 Flash.

---

## ✨ Features

- **AI Mental Health Chatbot** – Real-time conversational support using Gemini 2.0 Flash
- **Responsive Design** – Beautiful, accessible UI optimized for desktop and mobile
- **Professional Dashboard** – Organized mental health resources and insights
- **PDF Export** – Generate and download session summaries and reports
- **Secure Backend** – Express.js server with CORS and environment variable protection
- **Real-time Analytics** – Visual charts and mental health tracking (Chart.js)
- **Crisis Resources** – Quick access to emergency mental health support

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Node.js, Express.js |
| **AI Engine** | Google Gemini 2.0 Flash API |
| **APIs** | Google GenAI SDK (`@google/genai`) |
| **Libraries** | CORS, dotenv, html2pdf.js, Chart.js, Font Awesome |

---

## 📋 Requirements

- Node.js (v14+)
- npm or yarn
- Google Gemini API Key (free tier available)

---

## 🚀 Installation

### 1. Clone or Extract Repository
```bash
cd Neuro-Heal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Create or update `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=development
```

**Get a Gemini API Key:**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy and paste into `.env`

### 4. Start the Server
```bash
npm start
```

Server will run on `http://localhost:3000`

---

## 📖 Usage

### Running the Application

```bash
# Development mode
npm run dev

# Production mode (after building if applicable)
npm start
```

### Accessing the Portal

1. Open your browser to `http://localhost:3000`
2. Navigate through the mental health resources
3. Use the AI chatbot for real-time support
4. Export sessions as PDF

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the main dashboard |
| `POST` | `/api/chat` | Sends message to Gemini chatbot |
| `GET` | `/api/health` | Server health check |

---

## 🔐 Security Notes

- **API Key Protection**: Keep `GEMINI_API_KEY` secret. Never commit `.env` to version control.
- **CORS Configuration**: Configured for localhost development. Update in production.
- **Rate Limiting**: Implement rate limiting on production deployments.
- **Input Validation**: User inputs are sanitized before API calls.

---

## 📂 Project Structure

```
Neuro-Heal/
├── index.html          # Main UI dashboard
├── server.js           # Express backend
├── script.js           # Frontend logic & chatbot interaction
├── style.css           # Responsive styling
├── package.json        # Dependencies & scripts
├── .env                # Environment variables (not committed)
├── .gitignore          # Git ignore rules
└── node_modules/       # Installed packages
```

---

## 🐛 Troubleshooting

### Issue: "GEMINI_API_KEY is not set"
**Solution**: Ensure `.env` contains a valid API key from Google AI Studio.

### Issue: CORS errors
**Solution**: Backend includes CORS middleware. For custom domains, update `server.js`:
```javascript
app.use(cors({ origin: 'https://yourdomain.com' }));
```

### Issue: Port 3000 already in use
**Solution**: Specify a different port:
```bash
PORT=3001 npm start
```

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License. See LICENSE file for details.

---

## ⚠️ Disclaimer

**Neuro-Heal is not a substitute for professional mental health treatment.** The AI chatbot provides general wellness support only. For mental health crises or serious concerns, please contact:

- **National Suicide Prevention Lifeline**: 988 (US)
- **Crisis Text Line**: Text HOME to 741741
- **International Association for Suicide Prevention**: https://www.iasp.info/resources/Crisis_Centres/

---

## 📧 Support

For questions or issues, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for mental wellness.**
