const API_KEY = "AIzaSyDh6M4a5dYIrZMIeETU-8PF0hp965_ltr4"; // හරියටම Key එක දාන්න

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`)
    .then(response => response.json())
    .then(data => {
        console.log("✅ ඔයාගේ API Key එකට වැඩ කරන Models ලිස්ට් එක:\n");
        if(data.models) {
            data.models.forEach(model => {
                if(model.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`👉 ${model.name.replace('models/', '')}`);
                }
            });
        } else {
            console.log("අවුලක්! Models ආවේ නෑ:", data);
        }
    })
    .catch(error => console.error("Error එකක් ආවා:", error));