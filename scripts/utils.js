//
// UI Management
//
function enableChat() {
  sendBtn.disabled = false;
  sendInput.disabled = false;
  sendInput.focus();
}

function disableChat() {
  sendBtn.disabled = true;
  sendInput.disabled = true;
}

function toggleGeppetto() {
  chatVisible = !chatVisible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
  chatInput.focus();
  show = !show;
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
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
  chatInput.focus();
  show = item.visible;
}

function onErrorShow(error) {
  show = false;
}

function KeyPress(e) {
  const evtobj = window.event ? event : e;
  if (evtobj.keyCode === 89 && evtobj.ctrlKey) {
    toggleGeppetto();
    if (chatVisible) {
      chatInput.focus();
    }
  } else if (evtobj.keyCode === 69 && evtobj.ctrlKey) {
    focusInput();
  }
}

function closeSuggestions() {
  const suggestions = document.getElementById("suggestionBox");
  suggestions.style.display = "none";
}

//
// Error Management
//

// Function to fetch handle errors
function handleFetchError(error) {
  console.error(error);
  sendBtn.disabled = false;
  sendInput.disabled = false;
}

//
// Text and Config Functions
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
    (message) => message.role === "user" || message.role === "assistant"
  );
}

function focusInput() {
  const inputField = document.getElementById("chatgeppetto-input");
  setTimeout(() => {
    inputField.focus();
  }, 100);
}

//
// Message Removal Functions
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
}

function clearChat() {
  document
    .querySelectorAll(
      ".chatgeppetto-message-body, .chatgeppetto-message-header"
    )
    .forEach((element) => element.remove());
}
