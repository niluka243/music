require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// .env file එකෙන් API key එක ගන්නවා (Security)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// වඩාත් වේගවත් සහ අලුත්ම මාදිලිය (gemini-2.5-flash) භාවිතා කරමු
const model = genAI.getGenerativeModel({ 
    model: "gemini-flash-latest", // හ
    systemInstruction: "You are an advanced, friendly, and highly intelligent AI assistant from Sri Lanka. You communicate naturally like a human. Use a friendly Sinhala and English mixed language (Singlish). Be concise but extremely helpful. Don't sound robotic. ඔයාගේ නම Widomai-pro AI. ඔයා හැදුණේ Widomai-pro කණ්ඩායමෙන්. කවුරු හරි ඔයා කවුද කියලා ඇහුවොත් අනිවාර්යයෙන්ම කියන්න ඔයා හැදුණේ 'Widomai-pro' එකෙන් කියලා. හැමෝටම හිතවත් විදිහට සිංහලෙන් උදව් කරන්න.  ",
});

// Users ලගේ chat history එක මතක තියාගන්න Map එකක්
const userSessions = new Map();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
    console.log('🚀 බොට් active කරන්න QR එක Scan කරන්න.');
});

client.on('ready', () => {
    console.log('✅ Advanced AI Bot සූදානම්!');
});

client.on('message', async (msg) => {
    if (msg.fromMe) return;

    const chatId = msg.from;
    const chat = await msg.getChat();

    try {
        console.log(`📩 පණිවිඩයක් ආවා (${chatId}): ${msg.body}`);
        
        // මනුස්සයෙක් වගේ ටයිප් කරනවා කියලා පෙන්නන්න
        await chat.sendStateTyping();

        // 1. පින්තූරයක් (Image) එව්වොත් ඒක කියවීම
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            
            if (media.mimetype.startsWith('image/')) {
                const prompt = msg.body || "මේ පින්තූරය ගැන විස්තර කරන්න.";
                
                const imagePart = {
                    inlineData: {
                        data: media.data,
                        mimeType: media.mimetype
                    }
                };

                const result = await model.generateContent([prompt, imagePart]);
                await msg.reply(result.response.text());
                console.log('🖼️ පින්තූරයට පිළිතුර යැව්වා!');
                return;
            }
        }

        // 2. සාමාන්‍ය Chat එක (මතකය සහිතව)
        let chatSession = userSessions.get(chatId);
        
        // අලුත් කෙනෙක් නම් එයාට අලුත් chat history එකක් හදනවා
        if (!chatSession) {
            chatSession = model.startChat({
                history: [], // මෙතනින් පරණ දේවල් මතක තියාගන්නවා
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.7, // 0.7 කියන්නේ ටිකක් creative විදිහට උත්තර දෙනවා
                },
            });
            userSessions.set(chatId, chatSession);
        }

        // පරණ මතකයත් එක්කම අලුත් ප්‍රශ්නෙට උත්තරේ ගන්නවා
        const result = await chatSession.sendMessage(msg.body);
        const text = result.response.text();

        await msg.reply(text);
        console.log('💬 පිළිතුර යැව්වා!');
        
    } catch (error) {
        console.error("❌ AI Error එකක් ආවා:", error.message);
        
        // Typing indicator එක නවත්තන්න
        await chat.clearState();

        if(error.message.includes('429')) {
             await msg.reply("අප්පටසිරි! මට එකපාර ගොඩක් මැසේජ් ආවා. ⏳ විනාඩි 5කින් විතර ආයේ මැසේජ් එකක් දාන්නකෝ.");
        } else if (error.message.includes('503') || error.message.includes('500')) {
             await msg.reply("සමාවෙන්න, මගේ Server එක මේ වෙලාවේ පොඩ්ඩක් busy වෙලා තියෙන්නේ. 🛠️ තව පොඩ්ඩකින් ට්‍රයි කරමු!");
        } else {
             await msg.reply("පොඩි technical අවුලක් ගියා. මම ඉක්මනටම ඒක හදාගන්නම්! ⚙️");
        }
    }
});

client.initialize();