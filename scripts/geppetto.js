// Constants
const SEARCH_RESULT_LIMIT = 5;

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
  disableChat();
  closeSuggestions();
  addChatMessage(assistant, "");
  executeCommand(message);
  enableChat();
}

//
// Function to add message to the chat window
// @param sender: the sender of the message
// @param message: the message to add
// @return void
//
function addChatMessage(sender, message) {
  if (sender == assistant || sender == you) {
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

//
// Function to get the text of the current page
//
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

//
// Function to ask the LLM to suggest a query to search the web
//
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
      instruction_template: template,
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

//
// Function to get search results
//
async function getSearchResults(url) {
  try {
    const urllist = await fetch(urlsearch, { origin: searchEngine })
      .then((response) => response.text())
      .then((pagecontent) => {
        const doc = new DOMParser().parseFromString(pagecontent, "text/html");
        const elementList = doc.querySelectorAll(["a"]);
        const filteredUrls = [];

        for (let u = 0; u < elementList.length - 1; u++) {
          const href = elementList.item(u).href.trim();
          if (
            href.includes(searchEngine) ||
            href.includes("proxy.thele.me") ||
            href.includes("web.archive.org")
          ) {
            continue;
          }
          filteredUrls.push(href);
        }

        return filteredUrls.slice(0, SEARCH_RESULT_LIMIT); // Adjust the limit as needed
      })
      .catch((error) => {
        console.error(error);
        sendBtn.disabled = false;
        sendInput.disabled = false;
      });

    const fetchPromises = urllist.map(async (url, index) => {
      return getWebSearchResult(url, index + 1, urllist.length);
    });

    const results = await Promise.all(fetchPromises);

    let pagelist = getText("resultPages");
    for (let t = 0; t < results.length; t++) {
      pagelist +=
        urllist[t] +
        getText("shortSeparator") +
        results[t] +
        getText("longSeparator");
    }
    history.pop();
    pagelist +=
      "Read and remember them carefully; you will be tested on them later.";
    history.push({ role: "system", content: pagelist });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    //remove last div whith class chatgeppetto-message-body
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body"
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.innerHTML = "";
    return pagelist;
  } catch (error) {
    handleFetchError(error);
    return ""; // Placeholder for error handling, adjust as needed
  }
}

//
// Function to fetch the content of a single search result URL
//
async function getWebSearchResult(url, currentIndex, totalUrls) {
  try {
    let text = await fetch(url, { origin: searchEngine })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }
        return response.text();
      })
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const elementList = doc.querySelectorAll([
          "p",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "figcaption",
        ]);
        let resultText = "";
        for (let u = 0; u < elementList.length; u++) {
          resultText += "\n\n" + elementList.item(u).textContent.trim();
        }
        return resultText.trim();
      })
      .catch((error) => {
        console.error(error);
        // Handle error
        return ""; // Placeholder for error handling, adjust as needed
      });

    return text;
  } catch (error) {
    handleFetchError(error);
    return ""; // Placeholder for error handling, adjust as needed
  }
}
