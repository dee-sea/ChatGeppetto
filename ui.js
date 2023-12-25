//
// Inject HTML code in the page
//
const htmlContent = `
      <button id="chatgeppetto-toggle" display="none"><i class="far fa-comment"></i></button>
      <div id="chatgeppetto-widget">
        <div id="chatgeppetto-container">
          <div id="chatgeppetto-title">ChatGeppetto</div>
          <div id="chatgeppetto-messages"></div>
          <div id="chatgeppetto-input-container">
            <input
              id="chatgeppetto-input"
              type="text"
              placeholder="Write your message"
            />
            <button id="chatgeppetto-send">Send</button>
            <div id="loading">
              <div class="spinner"></div>
              <div class="message">Loading...</div>
            </div>
          </div>
        </div>
      </div>
`;
var chatdiv = document.createElement("div");
chatdiv.innerHTML = htmlContent;
document.body.appendChild(chatdiv);

// Handler to the ctrl+y to show/hide the widget
document.onkeydown = KeyPress;

// Read configuration from the local storage and apply it
getConfigAndApply();

// Read the visivility of the widget from the local storage
let show;
browser.storage.local.get("visible").then(onGotShow, onErrorShow);

// get refs to UI elements
const chatToggle = document.getElementById("chatgeppetto-toggle");
const chatWidget = document.getElementById("chatgeppetto-widget");
const chatContainer = document.getElementById("chatgeppetto-container");
const chatMessages = document.getElementById("chatgeppetto-messages");
const chatInput = document.getElementById("chatgeppetto-input");
const chatSendButton = document.getElementById("chatgeppetto-send");
const sendBtn = document.getElementById("chatgeppetto-send");
const sendInput = document.getElementById("chatgeppetto-input");
const loadingElement = document.getElementById("loading");

// Variables definitions
let chatVisible = false;
let answer = "";
let history = [];

// Get the chat history from the local storage
browser.storage.local.get("hist").then(onGotHist, onErrorHist);

// listner for the toggle button
chatToggle.addEventListener("click", () => {
  chatVisible = !chatVisible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
});

// listner for the input field keydown event
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const userInput = chatInput.value.trim();
    if (userInput) {
      if (!userInput.startsWith("/") && !userInput.endsWith("+i")) {
        addChatMessage("You", markdownToHtml(userInput));
        history.push({ role: "user", content: userInput });
        browser.storage.local.set({ hist: JSON.stringify(history) });
      }
      //addChatMessage("You", userInput);
      sendChatMessage(userInput);
      chatInput.value = "";
    }
  }
});

// listner for the input field drop event
chatInput.addEventListener("drop", (event) => {
  event.preventDefault();
  const userInput = event.dataTransfer.getData("text");
  if (userInput.startsWith("http://") || userInput.startsWith("https://")) {
    addChatMessage("You", userInput);
    sendChatMessage(userInput);
  } else {
    let selectedText =
      getText("readText") +
      getText("longSeparator") +
      userInput +
      getText("longSeparator");
    addChatMessage("You", markdownToHtml(getText("selectedText")));
    history.push({ role: "system", content: selectedText });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    addChatMessage("ChatGeppetto", getText("ok"));
  }
});

// listner for the send button click event
chatSendButton.addEventListener("click", () => {
  const userInput = chatInput.value.trim();
  if (userInput) {
    addChatMessage("You", userInput);
    history.push({ role: "user", content: userInput });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    sendChatMessage(userInput);
    chatInput.value = "";
  }
});

// listner for the read-it message
browser.runtime.onMessage.addListener(async (msg) => {
  if (msg.command === "read-it") {
    alert("read-it");
  }
});
