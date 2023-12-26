// Config
var searchEngine = "";
var GEPPETTO_API_KEY = "";
var GEPPETTO_API_ENDPOINT = "";
var language = "en";
var template = "default";
var character = "ChatGeppetto";
var assistant = "ChatGeppetto";
var you = "You";

//
// Function to sent messages to the chatbot
// @param message: the message to send
// @return: nothing
//
async function sendChatMessage(message) {
  answer = "";
  let text = "";

  disableChat();

  addChatMessage(assistant, "");

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
  } else if (
    message.endsWith("+i") ||
    message.startsWith("Cherche ") ||
    message.startsWith("cherche ") ||
    message.startsWith("Recherche ") ||
    message.startsWith("recherche ") || // french
    message.startsWith("Search ") ||
    message.startsWith("search ") ||
    message.startsWith("Find ") ||
    message.startsWith("find ") // english
  ) {
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
    if (message.endsWith("+i")) {
      text = message.replace("+i", "");
    } else {
      // remove the first word
      word = message.split(" ").slice(0).join(" ");
      text = message.replace(word, "");
    }
    history.push({
      role: "user",
      content: text,
    });
    addChatMessage(you, markdownToHtml(text));
    addChatMessage(assistant, getText("searching"));
    let searchQuery = await getSearchQuery(history).then((response) => {
      return response;
    });
    searchQuery = searchQuery.replace('"', "");
    console.log("Searching the web for: " + searchQuery);
    var searchUrl = searchEngine + "?q=";
    console.log(searchUrl);
    urlsearch = searchUrl + encodeURIComponent(searchQuery);
    let searchResults = await getSearchResults(urlsearch);
    getResponse(history).then((response) => {
      enableChat();
    });
    return;
    //
    // Read page command
    //
  } else if (message.startsWith(":readpagecontent")) {
    text = message.replace(":readpagecontent ", "");

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
    addChatMessage(assistant, getText("ok"));
    history.push({ role: "assistant", content: getText("ok") });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    enableChat();
    return;
  } else if (message == ":hist") {
    // remove last div whith class chatgeppetto-message-header
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    console.log(history);
    enableChat();
    return;
  } else if (message == ":deleteConfig") {
    // remove last div whith class chatgeppetto-message-header
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    await deleteConfigFromLocalStorage();
    enableChat();
    return;
  } else if (message == ":deleteSuggestions") {
    // remove last div whith class chatgeppetto-message-header
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    deleteInputHistory();
    enableChat();
    return;
  } else if (message == ":config") {
    // remove last div whith class chatgeppetto-message-header
    let config = await readConfigFromLocalStorage();
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    console.log(config);
    enableChat();
    return;
  } else if (message.startsWith(":set ")) {
    // remove last div whith class chatgeppetto-message-header
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    setConfig(message);
    enableChat();
    return;
  } else if (message.startsWith(":save ")) {
    // remove :save from message
    message = message.replace(":save ", "");
    //check if message is a valid string to use as a name for the saved config
    let exists = await conversationExists(message);
    if (exists) {
      addChatMessage(assistant, getText("alreadyExists"));
      enableChat();
      return;
    }
    if (message.match(/^[a-zA-Z0-9]+$/)) {
      // remove last div whith class chatgeppetto-message-header
      const listMessageBody = document.querySelectorAll(
        ".chatgeppetto-message-header"
      );
      const messageBody = listMessageBody.item(listMessageBody.length - 1);
      messageBody.remove();
      saveConversation(message, history);
      await addChatMessage(assistant, getText("ok"));
    } else {
      addChatMessage(assistant, getText("invalidName"));
    }
    enableChat();
    return;
  } else if (message.startsWith(":load ")) {
    message = message.replace(":load ", "");
    let exists = await conversationExists(message);
    if (exists) {
      const listMessageBody = document.querySelectorAll(
        ".chatgeppetto-message-header"
      );
      const messageBody = listMessageBody.item(listMessageBody.length - 1);
      messageBody.remove();
      history = await loadConversation(message);
      await addChatMessage(assistant, getText("ok"));
      browser.storage.local.set({ hist: JSON.stringify(history) });
      location.replace(location.href);
    } else {
      addChatMessage(assistant, getText("invalidName"));
    }
    enableChat();
  } else if (message.startsWith(":delete ")) {
    message = message.replace(":delete ", "");
    let exists = await conversationExists(message);
    if (exists) {
      const listMessageBody = document.querySelectorAll(
        ".chatgeppetto-message-header"
      );
      const messageBody = listMessageBody.item(listMessageBody.length - 1);
      messageBody.remove();
      await deleteConversation(message);
      await addChatMessage(assistant, getText("ok"));
    } else {
      addChatMessage(assistant, getText("invalidName"));
    }
    enableChat();
  } else if (message == ":list") {
    // remove last div whith class chatgeppetto-message-header
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    let list = await listSavedConversations();
    console.log(list);
    let convlist = getText("savedConversations") + "\n\n";
    for (let i = 0; i < list.length; i++) {
      convlist += i + 1 + ". " + list[i].key + "\n";
    }
    await addChatMessage(assistant, markdownToHtml(convlist));
    enableChat();
    return;
    //
    // Clear command
    //
  } else if (message == ":pop") {
    // remove last div whith class chatgeppetto-message-body
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    // remove last div whith class chatgeppetto-message-header
    const listMessageHeader = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageHeader = listMessageHeader.item(listMessageHeader.length - 1);
    messageHeader.remove();
    history.pop();
    browser.storage.local.set({ hist: JSON.stringify(history) });
    location.replace(location.href);
    enableChat();
    focusInput();
    return;
  } else if (message.startsWith(":push ")) {
    var listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    var messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    var listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    var messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
    message = message.replace(":push ", "");
    let role = message.split(" ")[0];
    let content = message.replace(role + " ", "");
    if (
      role == "user" ||
      role == "assistant" ||
      role == "system" ||
      role == you ||
      role == assistant
    ) {
      if (role == you) {
        role = "user";
        name = you;
      } else if (role == assistant) {
        role = "assistant";
        name = assistant;
      } else if (role == "user") {
        name = you;
      } else if (role == "assistant") {
        name = assistant;
      } else if (role == "system") {
        history.push({
          role: role,
          content: content,
        });
        browser.storage.local.set({ hist: JSON.stringify(history) });
        enableChat();
        return;
      }
      addChatMessage(name, markdownToHtml(content));
      history.push({
        role: role,
        content: content,
      });
      browser.storage.local.set({ hist: JSON.stringify(history) });
      enableChat();
      return;
    } else {
      addChatMessage(assistant, getText("invalidRole"));
      enableChat();
      return;
    }
  } else if (message == ":clean") {
    const listMessageHeader = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageHeader = listMessageHeader.item(listMessageHeader.length - 1);
    messageHeader.remove();
    history = await cleanHistory(history);
    browser.storage.local.set({ hist: JSON.stringify(history) });
    enableChat();
    addChatMessage(assistant, getText("cleanhistory"));
    return;
  } else if (message == ":clear") {
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
    addChatMessage(assistant, markdownToHtml(getText("greeting")));
    enableChat();
    return;
    //
    // unknown command
    //
  } else if (message.startsWith(":")) {
    msg = getText("helpcmd");
    addChatMessage(assistant, markdownToHtml(msg));
    enableChat();
    return;
    //
    // Help command
    //
  } else if (message == "Help" || message == "help" || message == "?") {
    let msg = getText("help");
    addChatMessage(assistant, markdownToHtml(msg));
    enableChat();
    return;
  } else {
    //
    // Normal message
    //
    let suggestionBox = document.getElementById("suggestionBox");
    suggestionBox.style.display = "none";
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
      mode: "instruct",
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
  await fetch(url, { origin: searchEngine })
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
      addChatMessage(assistant, markdownToHtml(getText("loadError")));
      sendBtn.disabled = false;
      sendInput.disabled = false;
      let dumb = history.pop();
      dumb = history.pop();
      throw new Error("Something went badly wrong!");
    });
  return text;
}

function readPageContent() {
  addChatMessage(you, getText("readText"));
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
  command = ":readpagecontent " + text;
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
  await fetch(url, { origin: searchEngine })
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
    });
  return text;
}

async function getSearchResults(url) {
  let text = "";
  let urllist = [];
  pagecontent = await fetch(urlsearch, { origin: searchEngine }).then(
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
      elementList.item(u).href.includes(searchEngine) ||
      elementList.item(u).href.includes("proxy.thele.me") ||
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
