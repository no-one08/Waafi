# Waafi Loans - Full Stack Application

## Features
- 📱 Mobile-first responsive design
- 💰 Interactive loan calculator with sliders
- 🤖 Telegram Bot integration for admin approval
- 🔐 4-digit PIN verification
- 📲 5-digit OTP verification
- ✅ Real-time status polling

## Setup

### 1. Create Telegram Bot
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy your bot token
4. Send `/start` to your bot
5. Message your bot, then visit:
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
6. Find your `chat.id` - that's your `ADMIN_CHAT_ID`

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create `.env` file:
```env
PORT=3000
TELEGRAM_BOT_TOKEN=your_bot_token_here
ADMIN_CHAT_ID=your_telegram_chat_id
```

### 4. Run Server
```bash
npm start
# or for development:
npm run dev
```

### 5. Open in Browser
```
http://localhost:3000
```

## How It Works

1. **Client fills form** → enters loan details, personal info, and 4-digit PIN
2. **Submit** → Application sent to your Telegram bot
3. **You decide** in Telegram:
   - ✅ **Approve** → OTP generated & sent to client (logged in console for testing)
   - ❌ **Decline** → Client sees decline message
4. **Client enters OTP** → 5-digit code verification
5. **Success** → Loan approved, confirmation shown

## Telegram Bot Commands
- `/start` - Welcome message
- `/pending` - View pending applications
- `/approved` - View approved loans
- `/declined` - View declined loans
- `/help` - Show help

## Production Notes
- Replace in-memory storage with MongoDB/PostgreSQL
- Integrate SMS API (Twilio, Africa's Talking, etc.) for real OTP delivery
- Add HTTPS/SSL
- Add rate limiting
- Add input sanitization
- Use JWT for admin authentication
