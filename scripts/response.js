// Create an AbortController
let abortController = new AbortController();
let signal = abortController.signal;

// Function to get the stream response from the API endpoint
async function getResponse(history, continuation = false, realHistory = []) {
  disableChat();

  if (!readConfigFromLocalStorage()) {
    showConfigError();
    return;
  }

  const source = await getSource(history, continuation);

  if (GEPPETTO_API_ENDPOINT.startsWith("https://api.openai.com/")) {
    handleOpenAIResponse(source, history);
  } else {
    handleSSEResponse(source, history, continuation, realHistory);
  }

  enableChat();
}

// Function to handle OpenAI API response
async function handleOpenAIResponse(source, history) {
  try {
    const listMessageBody = document.querySelectorAll(
      ".chatgeppetto-message-body",
    );
    const messageBody = listMessageBody.item(listMessageBody.length - 1);

    const content = await getOpenAIContent(source);

    const html = markdownToHtml(content);
    messageBody.innerHTML = html;

    hljs.highlightAll();
    chatMessages.scrollTop = chatMessages.scrollHeight;

    history.push({ role: "assistant", content: content });

    browser.storage.local.set({ hist: JSON.stringify(history) });
    sendInput.disabled = false;
  } catch (e) {
    console.error(e);
  }
}

// Function to handle SSE response
function handleSSEResponse(source, history, continuation, realHistory) {
  const listCopy = document.querySelectorAll(".chatgeppetto-copy");
  const copy = listCopy.item(listCopy.length - 1);
  copy.style.display = "none";
  const listAbort = document.querySelectorAll(".chatgeppetto-abort");
  const abort = listAbort.item(listAbort.length - 1);
  abort.style.display = "block";

  source.addEventListener("abort", function (event) {
    // Handle the aborted state here
    console.log("SSE Connection Aborted", event);
    // Additional actions if needed
  });
  // source.addEventListener("error", function (e) {
  //   if (e.message === "Aborted") {
  //     // Handle the aborted state
  //     console.log("SSE Aborted");
  //   } else {
  //     console.error("SSE Error:", e);
  //   }
  // });

  // Function to handle the SSE response
  source.addEventListener("message", async function (e) {
    try {
      var payload = JSON.parse(e.data);
      if (payload.choices[0].finish_reason != "stop") {
        handleNonStopFinishReason(payload, continuation, history);
      } else {
        handleStopFinishReason(payload, history, continuation, realHistory);
      }
    } catch (e) {
      browser.storage.local.set({ hist: JSON.stringify(history) });
      const listMessageBody = document.querySelectorAll(
        ".chatgeppetto-message-body",
      );
      const messageBody = listMessageBody.item(listMessageBody.length - 1);
      const contButton = document.createElement("button");
      contButton.classList.add("chatgeppetto-cont");
      contButton.innerHTML = "...";
      contButton.setAttribute("title", "Continue");
    }
  });
}

// Function to handle non-stop finish reason
function handleNonStopFinishReason(payload, continuation, history) {
  if (payload.choices[0].finish_reason == "length") {
    handleLengthFinishReason(payload, history);
  } else {
    handleOtherFinishReason(payload, continuation);
  }
}

// Function to handle stop finish reason
function handleStopFinishReason(payload, history, continuation, realHistory) {
  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body",
  );
  const messageBody = listMessageBody.item(listMessageBody.length - 1);

  let contextLength = estimateContextLength(history);

  // Add the last message to the history
  let lastUserMessage = history
    .filter((message) => message.role === "user")
    .pop().content;

  if (continuation) {
    answer = lastUserMessage.replace(getText("continue"), "") + answer;
  }

  activateCopyButton();
  history.push({ role: "assistant", content: answer });

  handleContextLength(contextLength, history, continuation, realHistory);

  let html = markdownToHtml(answer);
  messageBody.innerHTML = html;

  const listMessageBody2 = document.querySelectorAll(
    ".chatgeppetto-message-body",
  );
  hljs.highlightAll();
  chatMessages.scrollTop = chatMessages.scrollHeight;

  copy.style.display = "block";
  abort.style.display = "none";

  browser.storage.local.set({ hist: JSON.stringify(history) });
  sendInput.disabled = false;
  answer = "";
}

// Function to handle SSE error
function handleError(e, history) {
  browser.storage.local.set({ hist: JSON.stringify(history) });

  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body",
  );
  const messageBody = listMessageBody.item(listMessageBody.length - 1);

  const contButton = document.createElement("button");
  contButton.classList.add("chatgeppetto-cont");
  contButton.innerHTML = "...";
  contButton.setAttribute("title", "Continue");
}

// Function to handle finish reason "length"
function handleLengthFinishReason(payload, history) {
  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body",
  );
  const messageBody = listMessageBody.item(listMessageBody.length - 1);

  activateCopyButton();

  const contButton = document.createElement("button");
  contButton.classList.add("chatgeppetto-cont");
  contButton.innerHTML = "...";
  contButton.setAttribute("title", "Continue");
  messageBody.appendChild(contButton);
}

// Function to handle finish reasons other than "stop" and "length"
function handleOtherFinishReason(payload, continuation) {
  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body",
  );
  const messageBody = listMessageBody.item(listMessageBody.length - 1);

  let chatbotResponseElement;

  if (continuation) {
    chatbotResponseElement = payload.choices[0].text;
  } else {
    chatbotResponseElement = payload.choices[0].delta.content;
  }

  appendChatElement(chatbotResponseElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to handle context length
function handleContextLength(
  contextLength,
  history,
  continuation,
  realHistory,
) {
  if (contextLength > cLength) {
    handleContextLengthExceed(contextLength, history);
  }

  if (continuation) {
    history = realHistory;
    history.pop();
    history.pop();
    history.push({ role: "assistant", content: answer });
  }
}

// Function to handle context length exceed
async function handleContextLengthExceed(contextLength, history) {
  addChatMessage(
    "ChatGeppetto",
    "I'm sorry, I can't remember that far back.",
    true,
  );

  await clean();

  const list = document.querySelectorAll(".chatgeppetto-message-body");
  const last = list.item(list.length - 2);
  const lastText = last.textContent;

  last.innerHTML = markdownToHtml(
    lastText + "\n\nContext length: " + contextLength,
  );
}

// Function to get OpenAI content
async function getOpenAIContent(source) {
  const response = await fetch(GEPPETTO_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GEPPETTO_API_KEY}`,
    },
    body: JSON.stringify({
      messages: history,
      model: "gpt-3.5-turbo",
      stream: false,
      temperature: temperature,
      max_tokens: maxTokens,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// Function to get SSE source
function getSource(history, continuation) {
  let source;

  if (continuation) {
    source = getContinuationSSE(history);
  } else {
    source = getNewSSE(history);
  }

  return source;
}

let sseInstance = null; // Declare a variable to store the SSE instance globally

// Function to get new SSE
function getNewSSE(history) {
  let endpoint = GEPPETTO_API_ENDPOINT;

  return new SSE(endpoint, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GEPPETTO_API_KEY}`,
    },
    payload: JSON.stringify({
      messages: history,
      mode: "chat-instruct",
      instruction_template: template,
      character: character,
      stream: true,
      temperature: temperature,
      max_tokens: maxTokens,
    }),
    abortSignal: signal,
  });
}

// Function to get continuation SSE
function getContinuationSSE(history) {
  let endpoint = GEPPETTO_API_ENDPOINT.replace("chat/", "");
  let text = history[history.length - 1].content;

  return new SSE(endpoint, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GEPPETTO_API_KEY}`,
    },
    payload: JSON.stringify({
      max_tokens: maxTokens,
      prompt: text,
      temperature: temperature,
      stream: true,
    }),
    abortSignal: signal,
  });
}

function resetAbortController() {
  abortController.abort();
  abortController = new AbortController();
  signal = abortController.signal;
}
