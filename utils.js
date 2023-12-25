function enableChat() {
  sendBtn.disabled = false;
  sendInput.disabled = false;
  sendInput.focus();
}

function disableChat() {
  sendBtn.disabled = true;
  sendInput.disabled = true;
}

//
// Function to turn the widget on or off
// @return void
//
function toggleGeppetto() {
  chatVisible = !chatVisible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
  chatInput.focus();
  show = !show;
  browser.storage.local.set({ visible: show });
}

//
// Callback functions to read history from the local storage
// @param item: the item to read
// @return void
//
function onGotHist(item) {
  history = JSON.parse(item.hist);
  var name = "";
  for (var i = 0; i < history.length; i++) {
    if (history[i].role == "user") {
      name = "You";
    } else if (history[i].role == "assistant") {
      name = "ChatGeppetto";
    } else {
      continue;
    }
    var converter = new showdown.Converter();
    converter.setFlavor("github");
    var html = converter.makeHtml(history[i].content);
    addChatMessage(name, html);
    hljs.highlightAll();
  }
}

//
// Callback functions to handle errors when reading history from he local storage
// @param error: the error to handle
// @return void
//
function onErrorHist(error) {
  history = [];
}

//
// Callback functions to read the visibility of the widget from the local storage
// @param item: the item to read
// @return void
//
function onGotShow(item) {
  chatVisible = item.visible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
  chatInput.focus();
  show = item.visible;
}

//
// Callback functions to handle errors when reading the visibility of the widget from the local storage
// @param error: the error to handle
// @return void
//
function onErrorShow(error) {
  show = false;
}

//
// Function to handle keypress events
// @param e: the event to handle
// @return void
//
function KeyPress(e) {
  var evtobj = window.event ? event : e;
  if (evtobj.keyCode == 89 && evtobj.ctrlKey) {
    toggleGeppetto();
    if (chatVisible) {
      chatInput.focus();
    }
  }
}

function markdownToHtml(text) {
  var converter = new showdown.Converter();
  converter.setFlavor("github");
  var html = converter.makeHtml(text);
  return html;
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}
