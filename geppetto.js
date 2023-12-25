// Config
var searchEngine = "https://searx.thele.me/";
var GEPPETTO_API_KEY = "sk-Skynet-openchatKEY";
var GEPPETTO_API_ENDPOINT = "https://chatapi.thele.me/v1/chat/completions";
var language = "fr";
var assistant_name = "ChatGeppetto";
var your_name = "You";

var searchUrl = searchEngine + "?q=";
//
// Function to sent messages to the chatbot
// @param message: the message to send
// @return: nothing
//
async function sendChatMessage(message) {
  answer = "";
  let text = "";

  disableChat();

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
      role: "system",
      content:
        getText("readText") +
        getText("longSeparator") +
        text +
        getText("longSeparator"),
    });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    enableChat();
    //
    // answer with internet command
    //
  } else if (message.endsWith("+i")) {
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    //remove last div whith class chatgeppetto-message-header
    const listMessageHeader = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageHeader = listMessageHeader.item(listMessageHeader.length - 1);
    messageHeader.remove();
    text = message.replace("+i", "");
    history.push({
      role: "user",
      content: text,
    });
    addChatMessage("You", markdownToHtml(text));
    addChatMessage("ChatGeppetto", getText("searching"));
    let searchQuery = await getSearchQuery(history).then((response) => {
      return response;
    });
    searchQuery = searchQuery.replace('"', "");
    console.log("Searching the web for: " + searchQuery);
    urlsearch = searchUrl + encodeURIComponent(searchQuery);
    let searchResults = await getSearchResults(urlsearch);
    getResponse(history).then((response) => {
      enableChat();
    });
    return;
    //
    // Read page command
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
      role: "system",
      content:
        getText("readText") +
        getText("longSeparator") +
        text +
        getText("longSeparator"),
    });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    addChatMessage("ChatGeppetto", getText("ok"));
    history.push({ role: "assistant", content: getText("ok") });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    enableChat();
    return;
  } else if (message == "/hist") {
    // remove last div whith class chatgeppetto-message-header
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    console.log(history);
    enableChat();
    return;
    //
    // Clear command
    //
  } else if (message == "/clear") {
    history = [];
    browser.storage.local.set({ hist: JSON.stringify(history) });
    enableChat();
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    const listMessageHeader = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    for (let i = 0; i < listMessageBody.length; i++) {
      listMessageBody.item(i).remove();
    }
    for (let i = 0; i < listMessageHeader.length; i++) {
      listMessageHeader.item(i).remove();
    }
    history.push({
      role: "assistant",
      content: getText("greeting"),
    });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    addChatMessage("ChatGeppetto", markdownToHtml(getText("greeting")));
    enableChat();
    return;
    //
    // unknown command
    //
  } else if (message.startsWith("/")) {
    msg = getText("helpcmd");
    addChatMessage("ChatGeppetto", markdownToHtml(msg));
    enableChat();
    return;
    //
    // Help command
    //
  } else if (message == "Help" || message == "help" || message == "?") {
    let msg = getText("help");
    addChatMessage("ChatGeppetto", markdownToHtml(msg));
    enableChat();
    return;
  } else {
    //
    // Normal message
    //
    await getResponse(history).then((response) => {
      enableChat();
    });
    content;
  }
  return;
}

async function getResponse(history) {
  var source = new SSE(GEPPETTO_API_ENDPOINT, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GEPPETTO_API_KEY}`,
    },
    payload: JSON.stringify({
      messages: history,
      mode: "chat-instruct",
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
      let html = markdownToHtml(answer);
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
    let html = markdownToHtml(answer);
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
      addChatMessage("ChatGeppetto", markdownToHtml(getText("loadError")));
      sendBtn.disabled = false;
      sendInput.disabled = false;
      sendInput.focus();
      let dumb = history.pop();
      dumb = history.pop();
      throw new Error("Something went badly wrong!");
    });
  return text;
}

function readPageContent() {
  addChatMessage("You", getText("readText"));
  history.push({ role: "user", content: getText("readText") });
  let text = "";
  pagecontent = document.body.innerHTML;
  let widget = document.querySelector("#chatgeppetto-widget").innerHTML;
  pagecontent = pagecontent.replace(widget, "");
  var doc = new DOMParser().parseFromString(pagecontent, "text/html");
  elementList = doc.querySelectorAll([
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "li",
    "span",
    "figcaption",
  ]);
  for (u = 0; u < elementList.length - 1; u++) {
    text = text + "\n\n" + elementList.item(u).textContent.trim();
  }
  text = text.trim();
  command = "/readpagecontent " + text;
  sendChatMessage(command);
}

async function getSearchQuery(history) {
  var localhistory = history;
  localhistory.push({
    role: "user",
    content: getText("keywords"),
  });
  const searchQuery = await fetch(GEPPETTO_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GEPPETTO_API_KEY}`,
    },
    body: JSON.stringify({
      messages: localhistory,
      mode: "instruct",
      instruction_template: "Mistral",
      stream: false,
      temperature: 1,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      return data.choices[0].message.content;
    })
    .catch((error) => {
      console.error("Error:", error);
    });
  return searchQuery;
}

async function getWebSearchResult(url) {
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
      sendBtn.disabled = false;
      sendInput.disabled = false;
      sendInput.focus();
    });
  return text;
}

async function getSearchResults(url) {
  let text = "";
  let urllist = [];
  pagecontent = await fetch(url, { origin: "https://searx.thele.me" }).then(
    (response) => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }
      return response.text();
    }
  );
  var doc = new DOMParser().parseFromString(pagecontent, "text/html");
  let pagelist = getText("resultPages");
  elementList = doc.querySelectorAll(["a"]);
  for (u = 0; u < elementList.length - 1; u++) {
    if (
      elementList.item(u).href.includes("proxy.thele.me") ||
      elementList.item(u).href.includes("searx.thele.me") ||
      elementList.item(u).href.includes("web.archive.org")
    )
      continue;
    url = elementList.item(u).href.trim();
    console.log("URL: " + url);
    urllist.push(url);
  }
  urllist = urllist.filter(onlyUnique);
  urllist = urllist.slice(0, 5);
  let urlnum = urllist.length;
  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body"
  );
  const messageBody = listMessageBody.item(listMessageBody.length - 1);
  messageBody.innerHTML = "";
  for (t = 0; t < urllist.length; t++) {
    messageBody.innerHTML =
      getText("reading") + (t + 1) + "/" + urllist.length + "*";
    pagelist =
      pagelist +
      urllist[t] +
      getText("shortSeparator") +
      (await getWebSearchResult(urllist[t])) +
      getText("longSeparator");
  }
  history.pop();
  pagelist =
    pagelist +
    "Read and remember them carefully, you will be tested on them later.";
  history.push({ role: "system", content: pagelist });
  browser.storage.local.set({ hist: JSON.stringify(history) });
  messageBody.innerHTML = "";
  return pagelist;
}
