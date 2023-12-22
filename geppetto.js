//
// Function to sent messages to the chatbot
// @param message: the message to send
// @return: nothing
//
async function sendChatMessage(message) {
  answer = "";
  let text = "";

  sendBtn.disabled = true;
  sendInput.disabled = true;

  addChatMessage("ChatGeppetto", "");

  //
  // Read webpage command
  //
  if (message.startsWith("http://") || message.startsWith("https://")) {
    text = await getWebpage(message);

    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.innerHTML = "";
    history.push({
      role: "user",
      content:
        "Lis attentivement et souviens toi du texte suivant:\n\n----------\n\n" +
        text +
        '\n\n----------\n\nQuand tu auras fini, tape juste "OK" sans rien de plus.',
    });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    enableChat();
    //
    // Clear command
    //
  } else if (message == "/clear") {
    history = [];
    browser.storage.local.set({ hist: JSON.stringify(history) });
    addChatMessage("ChatGeppetto", "New chat started.");
    enableChat();
    return;
    //
    // unknown command
    //
  } else if (message.startsWith("/")) {
    addChatMessage(
      "ChatGeppetto",
      "Sorry, I don't understand this command. the commands I understand are:\n\n- /clear: clear the chat history\n\n"
    );
    enableChat();
    return;
    //
    // Help command
    //
  } else if (message == "Help" || message == "help" || message == "?") {
    addChatMessage(
      "ChatGeppetto",
      "I'm a chatbot, I can answer your questions. You can also ask me to search the web for you. Just type your question or request and press enter. If you want me to read a page, just enter the url starting with http or https and you can also send commands by starting your input with /."
    );
    enableChat();
    return;
  }
  //
  // Normal message
  //
  getResponse(history);
}

function enableChat() {
  sendBtn.disabled = false;
  sendInput.disabled = false;
  sendInput.focus();
}

function disableChat() {
  sendBtn.disabled = true;
  sendInput.disabled = true;
}

async function getResponse(history) {
  var source = new SSE(OPENAI_API_ENDPOINT, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    payload: JSON.stringify({
      messages: history,
      mode: "chat",
      instruction_template: "Mistral",
      character: "ChatGeppetto",
      stream: true,
      temperature: 0.7,
    }),
  });
  source.addEventListener("message", function (e) {
    // Assuming we receive JSON-encoded data payloads:
    try {
      var payload = JSON.parse(e.data);
    } catch (e) {
      console.log(e);
    }
    if (payload.choices[0].finish_reason != "stop") {
      const chatbotResponseElement = payload.choices[0].delta.content;
      appendChatElement(chatbotResponseElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
      const listMessageBody = document.querySelectorAll(
        ".chatgeppetto-message-body"
      );
      const messageBody = listMessageBody.item(listMessageBody.length - 1);
      var converter = new showdown.Converter();
      converter.setFlavor("github");
      var html = converter.makeHtml(answer);
      messageBody.innerHTML = html;
      hljs.highlightAll();
      chatMessages.scrollTop = chatMessages.scrollHeight;
      history.push({ role: "assistant", content: answer });
      browser.storage.local.set({ hist: JSON.stringify(history) });
      sendBtn.disabled = false;
      sendInput.disabled = false;
      sendInput.focus();
    }
  });
}

//
// Function to add message to the chat window
// @param sender: the sender of the message
// @param message: the message to add
// @return void
//
function addChatMessage(sender, message) {
  const messageContainer = document.createElement("div");
  messageContainer.classList.add("chatgeppetto-message-container");
  const messageHeader = document.createElement("div");
  messageHeader.classList.add("chatgeppetto-message-header");
  messageHeader.textContent = sender + ":";
  const messageBody = document.createElement("div");
  messageBody.classList.add("chatgeppetto-message-body");
  messageBody.innerHTML = message;
  messageContainer.appendChild(messageHeader);
  messageContainer.appendChild(messageBody);
  chatMessages.appendChild(messageContainer);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

//
// Function to append message to the last message in the chat window (for streaming chatbot answers)
// @param token: the token to append
// @return void
//
function appendChatElement(token) {
  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body"
  );
  const messageBody = listMessageBody.item(listMessageBody.length - 1);
  const text = messageBody.innerHTML;
  if (token.startsWith("\n")) {
    var converter = new showdown.Converter();
    converter.setFlavor("github");
    var html = converter.makeHtml(answer);
    messageBody.innerHTML = html + token;
  } else {
    messageBody.innerHTML = messageBody.innerHTML + token;
  }
  hljs.highlightAll();
  chatMessages.scrollTop = chatMessages.scrollHeight;
  answer = answer + token;
}

//
// Function to get the text content of a webpage
// @param url: the url of the webpage
// @return: The text content of the webpage
//
async function getWebpage(url) {
  text = "";
  await fetch(url, { origin: "https://searx.thele.me" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }
      console.log(response);
      return response.text();
    })
    .then((html) => {
      var doc = new DOMParser().parseFromString(html, "text/html");
      elementList = doc.querySelectorAll([
        "p",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "figcaption",
      ]);
      for (u = 0; u < elementList.length; u++) {
        text = text + "\n\n" + elementList.item(u).textContent.trim();
      }
      text = text.trim();
    })
    .catch((error) => {
      console.error(error);
      addChatMessage(
        "ChatGeppetto",
        "Sorry, I was unable to process your request."
      );
      sendBtn.disabled = false;
      sendInput.disabled = false;
      sendInput.focus();
      let dumb = history.pop();
      dumb = history.pop();
      throw new Error("Something went badly wrong!");
    });
  return text;
}

//
// Function to turn the widget on or off
// @return void
//
function toggleGeppetto() {
  console.log("show 1: " + show);
  chatVisible = !chatVisible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
  chatInput.focus();
  show = !show;
  console.log("show 2: " + show);
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
    } else {
      name = "ChatGeppetto";
    }
    var converter = new showdown.Converter();
    converter.setFlavor("github");
    var html = converter.makeHtml(history[i].content);
    addChatMessage(name, html);
    hljs.highlightAll();
  }
}

//
// Callback functions to handle errors when reading history from the local storage
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
  console.log("got shoe: " + item.visible);
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
  console.log(error);
  show = false;
}

//
// Function to handle keypress events
// @param e: the event to handle
// @return void
//
function KeyPress(e) {
  var evtobj = window.event ? event : e;
  if (evtobj.keyCode == 89 && evtobj.ctrlKey) toggleGeppetto();
}
