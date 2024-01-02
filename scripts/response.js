//
// Function to get the stream response from the API endpoint
//
async function getResponse(history, continuation = false, realHistory = []) {
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
        max_tokens: maxTokens,
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
    if (continuation) {
      let endpoint = GEPPETTO_API_ENDPOINT.replace("chat/", "");
      console.log(endpoint);
      let text = history[history.length - 1].content;
      console.log("XXX" + text + "XXX");
      source = new SSE(endpoint, {
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
      });
    } else {
      let endpoint = GEPPETTO_API_ENDPOINT;
      source = new SSE(endpoint, {
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
      });
    }
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
        const listMessageBody = document.querySelectorAll(
          ".chatgeppetto-message-body",
        );
        const messageBody = listMessageBody.item(listMessageBody.length - 1);
        const contButton = document.createElement("button");
        contButton.classList.add("chatgeppetto-cont");
        contButton.innerHTML = "...";
        contButton.setAttribute("title", "Continue");
      }
      console.log(e.data);
      if (payload.choices[0].finish_reason != "stop") {
        if (payload.choices[0].finish_reason == "length") {
          console.log("length reason");
          // get the last div with class chatgeppetto-message-body
          const listMessageBody = document.querySelectorAll(
            ".chatgeppetto-message-body",
          );
          const messageBody = listMessageBody.item(listMessageBody.length - 1);
          const contButton = document.createElement("button");
          contButton.classList.add("chatgeppetto-cont");
          contButton.innerHTML = "...";
          contButton.setAttribute("title", "Continue");
          messageBody.appendChild(contButton);
        } else {
          var chatbotResponseElement;
          if (continuation) {
            chatbotResponseElement = payload.choices[0].text;
          } else {
            chatbotResponseElement = payload.choices[0].delta.content;
          }
          appendChatElement(chatbotResponseElement);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      } else {
        const listMessageBody = document.querySelectorAll(
          ".chatgeppetto-message-body",
        );
        const messageBody = listMessageBody.item(listMessageBody.length - 1);
        let contextLength = estimateContextLength(history);
        // add the last message to the history
        let lastUserMessage = history
          .filter((message) => message.role === "user")
          .pop().content;
        if (continuation) {
          answer = lastUserMessage.replace(getText("continue"), "") + answer;
        }
        history.push({ role: "assistant", content: answer });
        if (contextLength > cLength) {
          addChatMessage(
            "ChatGeppetto",
            "I'm sorry, I can't remember that far back.",
            true,
          );
          // if conversation contains elements with the system role
          await clean();
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
          removeLastMessage();
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
        if (continuation) {
          history = realHistory;
          history.pop();
          history.pop();
          history.push({ role: "assistant", content: answer });
        }
        let html = markdownToHtml(answer);
        messageBody.innerHTML = html;
        // get the last div with class chatgeppetto-message-body
        const listMessageBody2 = document.querySelectorAll(
          ".chatgeppetto-message-body",
        );
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
