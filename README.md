# Auto Image Namer

Automatically rename screenshots using OpenAI Vision API and Perplexity's Sonar Pro. Available as both a web application and desktop app with advanced queueing and analysis storage.

## 🚀 Features

### **Analysis & Processing**
- **4 AI Analysis Modes**:
  - 🔥 **Sonar Pro** (Cost-effective, default)
  - 🌐 **Sonar + Web Research** (Real-time web trends)  
  - 🎯 **OpenAI Standard** (Detailed analysis)
  - 💎 **OpenAI Advanced** (Ultra-detailed with accessibility insights)

- **Smart Batch Processing**: Upload up to 50 images at once
- **Intelligent Rate Limiting**: Automatic batching with delays to respect API limits
- **Screenshot Detection**: Automatically flags screenshots and unprofessional images
- **Professional Assessment**: Quality, composition, and website suitability evaluation

### **Queue & Storage System**
- **🔄 Analysis Queueing**: Run multiple analyses concurrently  
- **📝 Named Analyses**: Optional naming for organization
- **📚 24-Hour History**: Access previous analyses
- **❌ Queue Management**: Remove queued items with X buttons
- **💾 Persistent Storage**: Results saved automatically
- **🔄 Real-time Updates**: Live queue status and progress

### **User Experience**
- **🎨 Modern Web Interface**: Drag-and-drop with real-time feedback
- **🖥️ Desktop App**: Native application for quick access
- **📋 Copy Results**: One-click copy for easy file renaming
- **📱 Responsive Design**: Works on all screen sizes

## 📦 Installation & Setup

### **Web Application**

1. **Clone the repository**
   ```bash
   git clone https://github.com/GMG-Web-Design/auto-image-namer.git
   cd auto-image-namer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start the web server**
   ```bash
   npm start
   ```

5. **Open browser** → `http://localhost:3000`

### **Desktop Application**

1. **Follow steps 1-3 above**

2. **Run desktop app**
   ```bash
   npm run electron
   ```

3. **Build desktop app** (optional)
   ```bash
   # For your current platform
   npm run build
   
   # Specific platforms
   npm run build-mac    # macOS
   npm run build-win    # Windows  
   npm run build-linux  # Linux
   ```

## 🎯 Usage Guide

### **Basic Workflow**
1. **📝 Name your analysis** (optional)
2. **🎛️ Select analysis mode** (Sonar Pro recommended)
3. **📸 Upload images** (drag & drop or click)
4. **🚀 Click "Analyze Screenshots"**
5. **⏳ Monitor queue progress** 
6. **📋 Copy results** when complete
7. **🔄 Queue more analyses** as needed

### **Queue Management**
- **View Status**: Real-time progress of all analyses
- **Remove Items**: Click ❌ on queued items to cancel
- **Multiple Analyses**: Add new analyses while others process
- **History Access**: Click previous analyses to reload results

### **Analysis Modes Explained**

| Mode | Speed | Cost | Best For |
|------|-------|------|----------|
| **Sonar Pro** | ⚡ Fast | 💰 Low | General use, bulk processing |
| **Sonar + Web** | 🐌 Slow | 💰💰 Medium | Trend-aware analysis |
| **OpenAI Standard** | ⚡ Fast | 💰💰💰 High | Detailed professional assessment |
| **OpenAI Advanced** | 🐌 Slow | 💰💰💰💰 Very High | Technical specs, accessibility |

## 💰 Cost Estimation

### **Per Image Analysis**
- **Sonar Pro**: ~$0.001-0.002
- **Sonar + Web**: ~$0.003-0.005  
- **OpenAI Standard**: ~$0.01-0.02
- **OpenAI Advanced**: ~$0.02-0.03

### **50-Image Batch**
- **Sonar Pro**: ~$0.05-0.10 💚
- **Sonar + Web**: ~$0.15-0.25 💛
- **OpenAI Standard**: ~$0.50-1.00 🧡
- **OpenAI Advanced**: ~$1.00-1.50 ❤️

## ⚙️ Technical Details

### **Rate Limiting**
- 5 images per batch
- 0.5s delay between requests
- 2s delay between batches
- Automatic API protection

### **File Support**
- **Formats**: PNG, JPG, JPEG, GIF
- **Max Size**: 10MB per image
- **Max Batch**: 50 images
- **Storage**: 24-hour retention

### **Desktop App Features**
- **Native Performance**: Faster than web browsers
- **Auto Server**: Starts backend automatically  
- **System Integration**: Desktop shortcuts, file associations
- **Offline Ready**: No browser required

## 🛠️ Development

### **Web Development**
```bash
npm run dev  # Auto-restart server
```

### **Desktop Development** 
```bash
npm run electron-dev  # Development mode with DevTools
```

### **Building Desktop Apps**
```bash
npm run pack    # Test build (unpackaged)
npm run build   # Full build for current platform
```

## 🐛 Troubleshooting

### **Common Issues**

| Issue | Solution |
|-------|----------|
| **API Key Errors** | Check `.env` file format and keys |
| **Port 3000 in use** | Kill existing processes: `pkill -f "node server.js"` |
| **Desktop app won't start** | Ensure server dependencies installed |
| **Queue stuck** | Refresh page to restore queue monitoring |
| **Large files failing** | Compress images under 10MB |

### **Getting Help**
- Check browser console (F12) for errors
- Review server logs for API issues  
- Verify API key permissions and quotas

## 📁 Project Structure

```
auto-image-namer/
├── server.js              # Main web server
├── electron-main.js       # Desktop app entry point  
├── public/
│   └── index.html         # Web interface
├── saved-analyses/        # 24-hour analysis storage
├── assets/               # Desktop app icons
└── package.json          # Dependencies & build config
```

## 🚀 Deployment

### **Web App**
- Deploy to Heroku, Vercel, or any Node.js host
- Set environment variables on your platform
- Ensure file upload limits are configured

### **Desktop Distribution**
- Use `npm run build` to create installers
- Distribute DMG (Mac), NSIS (Windows), or AppImage (Linux)
- Consider code signing for production releases

## 📄 License

MIT License - feel free to use and modify!

---

**🎉 Ready to rename your images like a pro!** Start with the web app, then try the desktop version for the full experience. 