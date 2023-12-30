//
// Function to get the stream response from the API endpoint
//
async function getResponse(history) {
  console.log("getResponse()");
  console.log("Endpoint: " + GEPPETTO_API_ENDPOINT);
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
        temperature: 0.7,
        max_tokens: 500,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("OPENAI RESPONSE:");
        console.log(data);
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
        temperature: 0.7,
      }),
    });
  }

  if (GEPPETTO_API_ENDPOINT.startsWith("https://api.openai.com/")) {
    try {
      console.log("SOURCE:");
      console.log(source);
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
      sendBtn.disabled = false;
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
    source.addEventListener("message", function (e) {
      // Assuming we receive JSON-encoded data payloads:
      try {
        var payload = JSON.parse(e.data);
      } catch (e) {
        browser.storage.local.set({ hist: JSON.stringify(history) });
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
        let html = markdownToHtml(answer);
        messageBody.innerHTML = html;
        hljs.highlightAll();
        chatMessages.scrollTop = chatMessages.scrollHeight;
        history.push({ role: "assistant", content: answer });
        browser.storage.local.set({ hist: JSON.stringify(history) });
        sendBtn.disabled = false;
        sendInput.disabled = false;
        answer = "";
      }
    });
  }
}
