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
              autofocus
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

var inputHistory = [""];
var ihLength = 0;
var ihIndex = 0;

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

// add a listner to the input fied to focus make him grab focus on load
chatInput.addEventListener("load", () => {
  chatInput.focus();
});

chatInput.addEventListener("keydown", function (event) {
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault(); // Prevent the default behavior of arrow keys (e.g., scrolling)

    if (event.key === "ArrowUp" && ihIndex < ihLength) {
      console.log("ArrowUp");
      // Move up in history
      ihIndex++;
      console.log(inputHistory[ihIndex]);
      chatInput.value = inputHistory[ihIndex];
    } else if (event.key === "ArrowDown" && ihIndex > 0) {
      console.log("ArrowDown");
      // Move down in history
      ihIndex--;

      // Set the input value to the selected history entry
      chatInput.value = ihIndex === -1 ? "" : inputHistory[ihIndex];
    }
  }
});

chatInput.addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const userInput = chatInput.value.trim();

    // Add the entered text to history when Enter is pressed
    inputHistory.unshift(userInput);
    ihLength = inputHistory.length - 1;
    ihIndex = 0;

    // Ensure "" is always at the first position in history
    if (inputHistory[0] !== "") {
      inputHistory.unshift("");
      ihLength++;
    }

    // Limit the history to a certain number of entries if needed
    const maxHistoryLength = 100;
    if (inputHistory.length > maxHistoryLength) {
      inputHistory.pop();
      ihLength--;
    }

    console.log("ihLength: " + ihLength);
    console.log(inputHistory);

    // filter inputHistory to remove empty strings
    inputHistory = inputHistory.filter((x) => x !== "");
    inputHistory = inputHistory.filter(onlyUnique);
    inputHistory.unshift("");
    ihLength = inputHistory.length - 1;
    if (userInput) {
      if (!userInput.startsWith(":") && !userInput.endsWith("+i")) {
        addChatMessage(you, markdownToHtml(userInput));
        history.push({ role: "user", content: userInput });
        browser.storage.local.set({ hist: JSON.stringify(history) });
      }
      sendChatMessage(userInput);
      chatInput.value = "";
      ihIndex = 0;
    }
  }
});

// listner for the input field drop event
chatInput.addEventListener("drop", (event) => {
  event.preventDefault();
  const userInput = event.dataTransfer.getData("text");
  if (userInput.startsWith("http://") || userInput.startsWith("https://")) {
    addChatMessage(you, userInput);
    sendChatMessage(userInput);
  } else {
    let selectedText =
      getText("readText") +
      getText("longSeparator") +
      userInput +
      getText("longSeparator");
    addChatMessage(you, markdownToHtml(getText("selectedText")));
    history.push({ role: "system", content: selectedText });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    addChatMessage(assistant, getText("ok"));
  }
});

// listner for the send button click event
chatSendButton.addEventListener("click", () => {
  const userInput = chatInput.value.trim();
  if (userInput) {
    addChatMessage(you, userInput);
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
