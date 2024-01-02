//
// Function to get the stream response from the API endpoint
//
async function getResponse(history) {
  disableChat();
  var source;
  if (!readConfigFromLocalStorage()) {
    addChatMessage(
      "Geppetto",
      "Please set the API endpoint in the options with: `:set api <endpoint URL>`.\n\n For example: `:set api https://api.openai.com/v1/chat/completions` to use OpenAI.",
      true,
    );
    return;
  }
  if (GEPPETTO_API_ENDPOINT == "") {
    addChatMessage(
      "Geppetto",
      "Please set the API endpoint in the options with: `:set api <endpoint URL>`.\n\n For example: `:set api https://api.openai.com/v1/chat/completions` to use OpenAI.",
      true,
    );
    return;
  } else if (GEPPETTO_API_ENDPOINT.startsWith("https://api.openai.com/")) {
    console.log("Using OpenAI API");
    source = await fetch(GEPPETTO_API_ENDPOINT, {
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
        max_tokens: 500,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        return data.choices[0].message.content;
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  } else {
    console.log("Using TextGen API");
    source = new SSE(GEPPETTO_API_ENDPOINT, {
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
        max_tokens: 2048,
      }),
    });
  }

  if (GEPPETTO_API_ENDPOINT.startsWith("https://api.openai.com/")) {
    try {
      const listMessageBody = document.querySelectorAll(
        ".chatgeppetto-message-body",
      );
      const messageBody = listMessageBody.item(listMessageBody.length - 1);
      let html = markdownToHtml(source);
      messageBody.innerHTML = html;
      hljs.highlightAll();
      chatMessages.scrollTop = chatMessages.scrollHeight;
      history.push({ role: "assistant", content: source });
      browser.storage.local.set({ hist: JSON.stringify(history) });
      sendInput.disabled = false;
    } catch (e) {
      console.error(e);
    }
  } else {
    //
    // Function to handle the SSE error response
    //
    source.addEventListener("error", function (e) {
      console.error("SSE Error:", e);
    });

    //
    // Function to handle the SSE response
    //
    source.addEventListener("message", async function (e) {
      // Assuming we receive JSON-encoded data payloads:
      try {
        var payload = JSON.parse(e.data);
      } catch (e) {
        browser.storage.local.set({ hist: JSON.stringify(history) });
        // return;
      }
      if (payload.choices[0].finish_reason != "stop") {
        const chatbotResponseElement = payload.choices[0].delta.content;
        appendChatElement(chatbotResponseElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } else {
        const listMessageBody = document.querySelectorAll(
          ".chatgeppetto-message-body",
        );
        const messageBody = listMessageBody.item(listMessageBody.length - 1);
        let contextLength = estimateContextLength(history);
        console.log("Context length: " + contextLength);
        // add the last message to the history
        history.push({ role: "assistant", content: answer });
        if (contextLength > cLength) {
          addChatMessage(
            "ChatGeppetto",
            "I'm sorry, I can't remember that far back.",
            true,
          );
          clean();
          const list = document.querySelectorAll(".chatgeppetto-message-body");
          const last = list.item(list.length - 2);
          const lastText = last.textContent;
          last.innerHTML = markdownToHtml(
            lastText + "\n\nContext length: " + contextLength,
          );
        }
        contextLength = estimateContextLength(history);
        if (contextLength > cLength) {
          addChatMessage(
            "ChatGeppetto",
            markdownToHtml(
              "Context length too long, generating conversation summary, please wait.",
            ),
            true,
          );
          // split the history in 2 parts. one called lastHistory and the other called oldHistory
          // last history will contain the last 6 messages and oldHistory will contain the rest
          let lastHistory = [];
          let oldHistory = [];
          for (let i = 0; i < history.length; i++) {
            if (i < history.length - keep * 2) {
              oldHistory.push(history[i]);
            } else {
              lastHistory.push(history[i]);
            }
          }
          summary = await summarizeConversation(oldHistory);
          history = [];
          history.push({
            role: "assistant",
            content: summary,
          });
          browser.storage.local.set({ hist: JSON.stringify(history) });
          for (message of lastHistory) {
            history.push(message);
          }
          browser.storage.local.set({ hist: JSON.stringify(history) });
        }
        contextLength = estimateContextLength(history);
        if (contextLength > cLength) {
          if (cLength < 32000) {
            cLength = cLength * 2;
            addChatMessage(
              "ChatGeppetto",
              markdownToHtml("extentding context length to:" + cLength + "."),
              true,
            );
          } else {
            addChatMessage(
              "ChatGeppetto",
              markdownToHtml("context length too long:" + cLength + "."),
              true,
            );
          }
        }
        let html = markdownToHtml(answer);
        messageBody.innerHTML = html;
        hljs.highlightAll();
        chatMessages.scrollTop = chatMessages.scrollHeight;
        browser.storage.local.set({ hist: JSON.stringify(history) });
        sendInput.disabled = false;
        answer = "";
      }
    });
  }
  // if the role of the last message is "user" then add the answer to the history
  if (
    history[history.length - 1].role === "user" ||
    history[history.length - 1].role === "system"
  ) {
    history.push({ role: "assistant", content: answer });
  }
  enableChat();
}
