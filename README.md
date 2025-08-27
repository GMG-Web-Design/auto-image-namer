# Auto Image Namer

A simple web app that uses OpenAI's Vision API to automatically generate descriptive filenames for your screenshots.

## Features

- 📸 **Drag & Drop Interface** - Simply drag screenshots into the browser
- 🤖 **AI-Powered Analysis** - Uses OpenAI GPT-4o to understand image content
- 📋 **Copy-Paste Ready** - Get results in a format perfect for Cursor
- 🚀 **Batch Processing** - Handle up to 50 images at once with intelligent rate limiting
- 💰 **Cost Efficient** - Uses "low detail" mode to minimize API costs

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get OpenAI API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 3. Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 4. Start the Server

```bash
npm start
```

The app will be available at: **http://localhost:3000**

## Usage

1. **Open the app** in your browser at `http://localhost:3000`
2. **Drop screenshots** into the upload area (or click to select files)
3. **Click "Analyze Screenshots"** and wait a few seconds
4. **Copy the results** using the "Copy All" button
5. **Paste into Cursor** and ask it to rename your files

### Example Output

```
Screenshot 2024-01-15 at 2.30.45 PM.png → gmail-inbox-unread-messages.png
IMG_1234.png → slack-team-chat-discussion.png
Screen Shot 2024-01-15 at 3.15.22 PM.png → figma-design-mockup-homepage.png
```

## Supported Files

- **Formats**: PNG, JPG, GIF, WebP
- **Size Limit**: 10MB per file
- **Batch Limit**: 50 files at once (processed in groups of 5 with rate limiting)

## Cost Estimation

Using GPT-4o with "low detail" mode:
- **Small screenshots** (~100KB): ~$0.01 per image
- **Large screenshots** (~1MB): ~$0.02-0.03 per image
- **Batch of 10 images**: Usually under $0.50
- **Batch of 50 images**: Usually $2-3 (with high detail mode)

## Development

```bash
# For development with auto-reload
npm run dev
```

## Troubleshooting

### "API key not found" error
- Make sure you created the `.env` file
- Check that your API key starts with `sk-`
- Restart the server after adding the key

### "File too large" error
- Screenshots over 10MB need to be compressed
- Try reducing image quality or dimensions

### "Analysis failed" error
- Check your OpenAI account has credits
- Verify your API key has Vision API access

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Node.js + Express
- **AI**: OpenAI GPT-4o Vision API
- **File Upload**: Multer

## License

MIT 