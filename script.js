document.addEventListener("DOMContentLoaded", function () {
  const chatbotContainer = document.getElementById("chatbot-container");
  const closeBtn = document.getElementById("close-btn");
  const sendBtn = document.getElementById("send-btn");
  const chatBotInput = document.getElementById("chatbot-input");
  const chatbotMessages = document.getElementById("chatbot-messages");
  const chatbotIcon = document.getElementById("chatbot-icon");
  const uploadInput = document.getElementById("upload-input");
  const inputContainer = document.getElementById("chatbot-input-container");

  // Initialize custom knowledge base
  let customKnowledge = "";

  // Initialize with a welcome message
  setTimeout(() => {
    appendMessage(
      "bot",
      "Hello! I'm your chatbot assistant. You can upload .txt or .pdf files to train me on your data."
    );
  }, 500);

  chatbotIcon.addEventListener("click", function () {
    chatbotContainer.classList.remove("hidden");
    chatbotIcon.style.display = "none";
  });

  closeBtn.addEventListener("click", function () {
    chatbotContainer.classList.add("hidden");
    chatbotIcon.style.display = "flex";
  });

  sendBtn.addEventListener("click", sendMessage);
  chatBotInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
  });

  // Create an explicit upload button
  const uploadButton = document.createElement("button");
  uploadButton.id = "upload-btn";
  uploadButton.innerHTML = "📎";
  uploadButton.setAttribute("title", "Upload file (.txt, .pdf)");
  inputContainer.insertBefore(uploadButton, sendBtn);

  // Add click event to the upload button
  uploadButton.addEventListener("click", function () {
    uploadInput.click();
  });

  uploadInput.addEventListener("change", handleFileUpload);
});

function sendMessage() {
  const userMessage = document.getElementById("chatbot-input").value.trim();
  if (userMessage) {
    appendMessage("user", userMessage);
    document.getElementById("chatbot-input").value = "";
    getBotResponse(userMessage);
  }
}

function appendMessage(sender, message) {
  const messagesContainer = document.getElementById("chatbot-messages");
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", sender);
  messageElement.textContent = message;
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Global variable to store custom knowledge
let customKnowledge = "";

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  appendMessage("bot", `Processing file: ${file.name}...`);

  try {
    if (file.type === "application/pdf") {
      // Make sure PDF.js is loaded
      if (typeof pdfjsLib === "undefined") {
        console.error("PDF.js library not loaded");
        appendMessage(
          "bot",
          "PDF processing library not loaded. Please try a text file instead."
        );
        return;
      }

      const pdfContent = await readPDF(file);
      customKnowledge += "\n\n" + pdfContent;
      appendMessage(
        "bot",
        `PDF uploaded successfully! I've learned ${pdfContent.length} characters of new information.`
      );
    } else {
      const textContent = await readTextFile(file);
      customKnowledge += "\n\n" + textContent;
      appendMessage(
        "bot",
        `File uploaded successfully! I've learned ${textContent.length} characters of new information.`
      );
    }
  } catch (error) {
    console.error("Error processing file:", error);
    appendMessage(
      "bot",
      "Sorry, I couldn't process that file. Please try another one."
    );
  }
}

async function readPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ");
    }

    return text;
  } catch (error) {
    console.error("Error reading PDF:", error);
    throw new Error("Failed to read PDF file");
  }
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error("Failed to read text file"));
    reader.readAsText(file);
  });
}

async function getBotResponse(userMessage) {
  const API_KEY = "YOUR_API_KEY";
  const API_URL = "https://api.openai.com/v1/chat/completions";

  // Show typing indicator
  const typingIndicator = document.createElement("div");
  typingIndicator.classList.add("message", "bot", "typing");
  typingIndicator.textContent = "Thinking...";
  document.getElementById("chatbot-messages").appendChild(typingIndicator);

  try {
    // Create context with custom knowledge if available
    let prompt = userMessage;
    if (customKnowledge.trim() !== "") {
      prompt = `I've been provided with the following information: \n\n${customKnowledge}\n\nBased on this information, please answer: ${userMessage}`;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that answers questions based on the user's uploaded documents. If the answer is not in the provided information, you should say so.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    // Remove typing indicator
    document.getElementById("chatbot-messages").removeChild(typingIndicator);

    const data = await response.json();

    if (!data.choices || !data.choices.length) {
      throw new Error("No response from OpenAI API");
    }

    const botMessage = data.choices[0].message.content;
    appendMessage("bot", botMessage);
  } catch (error) {
    // Remove typing indicator
    if (document.querySelector(".typing")) {
      document.getElementById("chatbot-messages").removeChild(typingIndicator);
    }

    console.error("Error:", error);
    appendMessage(
      "bot",
      "Sorry, I'm having trouble responding. Please try again."
    );
  }
}
