// define the search url
searchUrl = "https://searx.thele.me/?q=";

// hos and key for the API
const OPENAI_API_KEY = "sk-Skynet-openchatKEY";
const OPENAI_API_ENDPOINT = "https://chatapi.thele.me/v1/chat/completions";

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
    console.log("system insert 2");
    history.push({
      role: "system",
      content:
        "Lis attentivement et souviens toi du texte suivant:\n\n----------\n\n" +
        text +
        '\n\n----------\n\nQuand tu auras fini, fait bien attention a ne dire que "OK" sans rien de plus ni avant ni après.',
    });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    enableChat();
    //
    // answer with internet command
    //
  } else if (message.endsWith("+i")) {
    text = message.replace("+i", "");
    history.push({
      role: "user",
      content: text,
    });
    let searchQuery = await getSearchQuery(history).then((response) => {
      return response;
    });
    console.log("searchQuery: " + searchQuery);
    searchQuery = searchQuery.replace('"', "");
    console.log(history);
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    console.log("Searching the web for: " + searchQuery);
    urlsearch = searchUrl + encodeURIComponent(searchQuery);
    console.log("urlsearch: " + urlsearch);
    let searchResults = await getSearchResults(urlsearch);
    console.log("searchResults: " + searchResults);
    history.push({
      role: "user",
      content: text,
    });
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
    console.log("system insert 3");
    history.push({
      role: "system",
      content:
        "Lis attentivement et souviens toi du texte suivant:\n\n----------\n\n" +
        text +
        '\n\n----------\n\nQuand tu auras fini, tape juste "OK" sans rien de plus.',
    });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    addChatMessage("ChatGeppetto", "OK, I did it");
    history.push({ role: "assistant", content: "OK, I did it" });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    enableChat();
    return;
  } else if (message == "/hist") {
    console.log(history);
    // remove last div whith class chatgeppetto-message-header
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-header"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.remove();
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
  } else {
    //
    // Normal message
    //
    await getResponse(history).then((response) => {
      enableChat();
    });
  }
  return;
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

function readPageContent() {
  addChatMessage("You", "Please read the page.");
  history.push({ role: "user", content: "Please read the page." });
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
    content:
      "Ne réponds pas à la question, donne juste des mots clés à chercher sur Google pour trouver la réponse. soit facuel, ajoute aucun text. Donne juste une liste de mots clés.",
  });
  const searchQuery = await fetch(OPENAI_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
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
      console.log("data: ");
      console.log(data);
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
  let pagelist = "Here are a bunch of results to help you answer:\n\n";
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
  for (t = 0; t < urllist.length; t++) {
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.innerHTML = "Reading page " + (t + 1) + "/" + urllist.length;
    pagelist =
      pagelist +
      urllist[t] +
      "\n\n-----\n\n" +
      (await getWebSearchResult(urllist[t])) +
      "\n\n----------\n\n";
  }
  history.pop();
  pagelist =
    pagelist +
    "Read and remember them carefully, you will be tested on them later.";
  console.log("system insert 1");
  history.push({ role: "system", content: pagelist });
  browser.storage.local.set({ hist: JSON.stringify(history) });
  return pagelist;
}
