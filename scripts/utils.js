//
// UI Management
//
function enableChat() {
  sendInput.disabled = false;
  sendInput.focus();
}

function disableChat() {
  sendInput.disabled = true;
}

function toggleGeppetto() {
  chatVisible = !chatVisible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatInput.focus();
  show = !show;
  const body = document.querySelector("body");
  if (chatVisible) {
    body.classList.add("chatgeppetto-open");
    chatWidget.classList.add("chatgeppetto-visible");
  } else {
    body.classList.remove("chatgeppetto-open");
    chatWidget.classList.remove("chatgeppetto-visible");
  }
  browser.storage.local.set({ visible: show });
  chatInput.focus();
}

function onGotHist(item) {
  history = JSON.parse(item.hist);
  for (const entry of history) {
    if (entry.role === "user" || entry.role === "assistant") {
      const name = entry.role === "user" ? you : assistant;
      const converter = new showdown.Converter();
      converter.setFlavor("github");
      const html = converter.makeHtml(entry.content);
      addChatMessage(name, html);
      hljs.highlightAll();
    }
  }
}

function onErrorHist(error) {
  history = [];
}

function onGotShow(item) {
  chatVisible = item.visible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatInput.focus();
  show = item.visible;
}

function onErrorShow(error) {
  show = false;
}

function toggleFullScreen() {
  const widget = document.getElementById("chatgeppetto-widget");
  const messages = document.getElementById("chatgeppetto-messages");
  const conversations = document.getElementById(
    "chatgeppetto-converstationSwitcher",
  );
  const inputcontainer = document.getElementById(
    "chatgeppetto-input-container",
  );
  widget.classList.toggle("fullscreen");
  messages.classList.toggle("fullscreen");
  inputcontainer.classList.toggle("fullscreen");
  conversations.classList.toggle("fullscreen");
}

//
// Suggestions Management
//

function closeSuggestions() {
  const suggestions = document.getElementById("chatgeppetto-suggestionBox");
  suggestions.style.display = "none";
}

function getFilteredSuggestions(inputValue, inputHistory) {
  return inputHistory.filter(
    (entry) =>
      entry.toLowerCase().startsWith(inputValue) && entry !== inputValue,
  );
}

//
// Error Management
//

// Function to fetch handle errors
function handleFetchError(error) {
  console.error(error);
  sendInput.disabled = false;
}

//
// Text Functions
//
function markdownToHtml(text) {
  const converter = new showdown.Converter();
  converter.setFlavor("github");
  const html = converter.makeHtml(text);
  return html;
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

function getText(textName) {
  if (statements[textName]) {
    const selectedLanguage = statements[textName][language] ? language : "en";
    return statements[textName][selectedLanguage] || "Text not found";
  } else {
    return "Text not found";
  }
}

function getSelectedText() {
  var text = "";
  if (window.getSelection) {
    text = window.getSelection().toString();
  } else if (document.selection && document.selection.type != "Control") {
    text = document.selection.createRange().text;
  } else if (document.getSelection()) {
    text = document.getSelection().toString();
  }
  console.log("text :", text);
  return text;
}

//
// Config Management
//
async function getConfigAndApply() {
  try {
    const config = await readConfigFromLocalStorage();
    applyConfig(config);
  } catch (error) {
    console.error("Error:", error);
  }
}

//
// History Functions
//
function cleanHistory(history) {
  return history.filter(
    (message) => message.role === "user" || message.role === "assistant",
  );
}

function focusInput() {
  const inputField = document.getElementById("chatgeppetto-input");
  setTimeout(() => {
    inputField.focus({ focusVisible: true });
  }, 100);
}

//
// Message Management Functions
//
function removeLastElement(selector) {
  const list = document.querySelectorAll(selector);
  const lastElement = list.item(list.length - 1);
  lastElement && lastElement.remove();
}

function removeLastHeader() {
  removeLastElement(".chatgeppetto-message-header");
}

function removeLastBody() {
  removeLastElement(".chatgeppetto-message-body");
}

function removeLastMessage() {
  removeLastBody();
  removeLastHeader();
  const lastContainer = document.querySelectorAll(
    ".chatgeppetto-message-container",
  );
  lastContainer.item(lastContainer.length - 1).remove();
}

function clearChat() {
  const bodies = chatMessages.querySelectorAll(".chatgeppetto-message-body");
  const headers = chatMessages.querySelectorAll(".chatgeppetto-message-header");
  const containters = chatMessages.querySelectorAll(
    "chatgeppetto-message-container",
  );
  bodies.forEach((body) => body.remove());
  headers.forEach((header) => header.remove());
  containters.forEach((container) => container.remove());
}

// Function to render or append messages to the UI
function renderMessages(history) {
  for (entry in history) {
    const message = history[entry];
    if (message.role === "user") {
      addChatMessage(you, markdownToHtml(message.content));
    } else if (message.role === "assistant") {
      addChatMessage(assistant, markdownToHtml(message.content));
    }
  }
}

function rebuildChatMessages(history) {
  // Clear existing messages
  clearChat();
  renderMessages(history);
  const containers = chatMessages.querySelectorAll(
    ".chatgeppetto-message-container",
  );
  // remove empty containers
  containers.forEach((container) => {
    if (!container.hasChildNodes()) {
      container.remove();
    }
  });
}

function emptyLastBody() {
  const lastBody = chatMessages.querySelector(
    ".chatgeppetto-message-body:last-child",
  );
  lastBody.innerHTML = "";
}

function copyToClipboard(text) {
  const dummyTextarea = document.createElement("textarea");
  dummyTextarea.value = text;
  document.body.appendChild(dummyTextarea);
  dummyTextarea.select();
  document.execCommand("copy");
  document.body.removeChild(dummyTextarea);
}

function estimateContextLength(chatHistory) {
  let totalTokens = 0;
  for (const message of chatHistory) {
    const tokens = message.content.split(/\s+/);
    totalTokens += tokens.length;
  }
  return totalTokens * 2;
}
