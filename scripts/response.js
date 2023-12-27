async function getResponse(history) {
  var source = new SSE(GEPPETTO_API_ENDPOINT, {
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

  source.addEventListener("error", function (e) {
    console.error("SSE Error:", e);
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
      answer = "";
    }
  });
}
