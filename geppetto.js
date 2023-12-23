searchUrl = "https://searx.thele.me/?q=";
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
        '\n\n----------\n\nQuand tu auras fini, fait bien attention a ne dire que "OK" sans rien de plus ni avant ni après.',
    });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    enableChat();
    //
    // search command
    //
  } else if (message.startsWith("/s ")) {
    //remove /readpagecontent from message
    query = await message.replace("/s ", "");

    text = searchTheWeb(query);

    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.innerHTML = "";
    enableChat();
    return;
    //
    // Read webpage command
    //
  } else if (message.startsWith("/readpagecontent")) {
    //remove /readpagecontent from message
    text = message.replace("/readpagecontent ", "");

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
  // get content of last message
  let msg = history[history.length - 1].content;
  if (msg.endsWith("+i")) {
    // internet on
    addChatMessage("ChatGeppetto", "Searching the web for :");
    history[history.length - 1].content = msg.replace("+i", "");
    browser.storage.local.set({ hist: JSON.stringify(history) });
    let Query = await query(history);
    let searchQuery = history[history.length - 1].content;
    searchQuery = searchQuery.replace('"', "").trim();
    Query = await searchTheWeb(searchQuery);
    history.push({ role: "user", content: msg.replace("+i", "") });
  }

  getResponse(history);
}

async function query(message) {
  text = await getQuery(message);
  return text;
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
    } catch (e) {}
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

async function getQuery(history) {
  localhistory = history;
  localhistory.push({
    role: "user",
    content:
      "Given the history and my previous statement, what's the best query to ask Google to help answer it? Just type the search query and nothing more before or aftre it as it will be sent as is to Google.",
  });
  var source = new SSE(OPENAI_API_ENDPOINT, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    payload: JSON.stringify({
      messages: localhistory,
      mode: "chat",
      instruction_template: "Mistral",
      character: "ChatGeppetto",
      stream: true,
      temperature: 1,
    }),
  });
  source.addEventListener("message", function (e) {
    // Assuming we receive JSON-encoded data payloads:
    try {
      var payload = JSON.parse(e.data);
    } catch (e) {}
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
  return history;
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
  if (evtobj.keyCode == 89 && evtobj.ctrlKey) toggleGeppetto();
}

async function readAllLinks() {
  sendBtn.disabled = true;
  sendInput.disabled = true;
  sendInput.value = "";
  let text = "";
  pagecontent = document.body.innerHTML;
  let widget = document.querySelector("#chatgeppetto-widget").innerHTML;
  pagecontent = pagecontent.replace(widget, "");
  var doc = new DOMParser().parseFromString(pagecontent, "text/html");
  elementList = doc.querySelectorAll(["a"]);
  pagelist =
    "Hera are a bunch of webpages with their respective URLs:\n\n----------\n\n";
  urllist = [];
  for (u = 0; u < elementList.length; u++) {
    if (
      elementList.item(u).href.includes("proxy.thele.me") ||
      elementList.item(u).href.includes("searx.thele.me") ||
      elementList.item(u).href.includes("web.archive.org")
    )
      continue;
    url = elementList.item(u).href.trim();
    urllist.push(url);
  }
  urllist = urllist.filter(onlyUnique);
  urllist = urllist.slice(0, 25);
  let urlnum = urllist.length;
  addChatMessage("You", "** Sent a list of " + urlnum + " pages to read **");
  addChatMessage("ChatGeppetto", "I'm reading them now...");
  for (t = 0; t < urllist.length; t++) {
    // Get the last div with class "chat-message"
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.innerHTML = "Reading page " + (t + 1) + "/" + urllist.length;
    console.log("URL: " + urllist[t]);
    pagelist =
      pagelist +
      urllist[t] +
      "\n\n-----\n\n" +
      (await getIt(urllist[t])) +
      "\n\n----------\n\n";
    console.log("Done. " + t + "/" + urllist.length + " pages read.");
  }
  pagelist =
    pagelist +
    "Read and remember them carefully, you will be tested on them later.";
  history.push({ role: "user", content: pagelist });
  browser.storage.local.set({ hist: JSON.stringify(history) });

  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body"
  );
  const messageBody = listMessageBody.item(listMessageBody.length - 1);
  messageBody.innerHTML = "OK";

  sendBtn.disabled = false;
  sendInput.disabled = false;
  sendInput.focus();
}

async function getIt(url) {
  text = await getWebpage(url);
  return text;
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

async function searchTheWeb(query) {
  sendBtn.disabled = true;
  sendInput.disabled = true;
  sendInput.value = "";
  let urllist = [];
  let elementList = [];
  searchquery = searchUrl + encodeURIComponent(query);
  pagecontent = await fetch(searchquery)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }
      return response.text();
    })
    .then((html) => {
      var doc = new DOMParser().parseFromString(html, "text/html");
      elementList = doc.querySelectorAll(["a"]);
      for (u = 0; u < elementList.length; u++) {
        if (
          elementList.item(u).href.includes("proxy.thele.me") ||
          elementList.item(u).href.includes("searx.thele.me") ||
          elementList.item(u).href.includes("web.archive.org") ||
          !elementList.item(u).href.startsWith("http")
        )
          continue;
        console.log(elementList.item(u).href);
        urllist.push(elementList.item(u).href);
      }
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
  urllist = urllist.filter(onlyUnique);
  urllist = urllist.slice(0, 10);
  let urlnum = urllist.length;
  let pagelist =
    "Those pagegs might be of interest to help answer:\n\n----------\n\n";
  for (t = 0; t < urllist.length; t++) {
    // Get the last div with class "chat-message"
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.innerHTML = "Reading page " + (t + 1) + "/" + urllist.length;
    pagelist =
      pagelist +
      urllist[t] +
      "\n\n-----\n\n" +
      (await getIt(urllist[t])) +
      "\n\n----------\n\n";
  }
  pagelist =
    pagelist +
    "Read and remember them carefully, you will be tested on them later.";
  history.push({ role: "user", content: pagelist });
  browser.storage.local.set({ hist: JSON.stringify(history) });

  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body"
  );
  const messageBody = listMessageBody.item(listMessageBody.length - 1);
  messageBody.innerHTML = "OK";

  sendBtn.disabled = false;
  sendInput.disabled = false;
  sendInput.focus();
}
