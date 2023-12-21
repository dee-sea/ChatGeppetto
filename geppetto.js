const htmlContent = `
      <button id="chat-toggle" display="none"><i class="far fa-comment"></i></button>
      <div id="chat-widget">
        <div id="chat-container">
          <div id="chat-title">ChatGeppetto</div>
          <div id="chat-messages"></div>
          <div id="chat-input-container">
            <input
              id="chat-input"
              type="text"
              placeholder="Write your message"
            />
            <button id="chat-send">Send</button>
            <div id="loading">
              <div class="spinner"></div>
              <div class="message">Loading...</div>
            </div>
          </div>
        </div>
      </div>
`;
var chatdiv = document.createElement("div");
chatdiv.innerHTML = htmlContent;
document.body.appendChild(chatdiv);

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
  }
}

function onErrorHist(error) {
  history = [];
}

function onGotShow(item) {
  console.log("got shoe: " + item.visible);
  chatVisible = item.visible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
  chatInput.focus();
  show = item.visible;
}

function onErrorShow(error) {
  console.log(error);
  show = false;
}

function KeyPress(e) {
  var evtobj = window.event ? event : e;
  if (evtobj.keyCode == 89 && evtobj.ctrlKey) toggleGeppetto();
}

document.onkeydown = KeyPress;

var SSE = function (url, options) {
  if (!(this instanceof SSE)) {
    return new SSE(url, options);
  }

  /** @type {number} */
  this.INITIALIZING = -1;
  /** @type {number} */
  this.CONNECTING = 0;
  /** @type {number} */
  this.OPEN = 1;
  /** @type {number} */
  this.CLOSED = 2;

  /** @type {string} */
  this.url = url;

  options = options || {};
  this.headers = options.headers || {};
  this.payload = options.payload !== undefined ? options.payload : "";
  this.method = options.method || (this.payload && "POST") || "GET";
  this.withCredentials = !!options.withCredentials;
  this.debug = !!options.debug;

  /** @type {string} */
  this.FIELD_SEPARATOR = ":";

  /** @type { {[key: string]: EventListener} } */
  this.listeners = {};

  /** @type {XMLHttpRequest} */
  this.xhr = null;
  /** @type {number} */
  this.readyState = this.INITIALIZING;
  /** @type {number} */
  this.progress = 0;
  /** @type {string} */
  this.chunk = "";

  /**
   * @type AddEventListener
   */
  this.addEventListener = function (type, listener) {
    if (this.listeners[type] === undefined) {
      this.listeners[type] = [];
    }

    if (this.listeners[type].indexOf(listener) === -1) {
      this.listeners[type].push(listener);
    }
  };

  /**
   * @type RemoveEventListener
   */
  this.removeEventListener = function (type, listener) {
    if (this.listeners[type] === undefined) {
      return;
    }

    var filtered = [];
    this.listeners[type].forEach(function (element) {
      if (element !== listener) {
        filtered.push(element);
      }
    });
    if (filtered.length === 0) {
      delete this.listeners[type];
    } else {
      this.listeners[type] = filtered;
    }
  };

  /**
   * @type DispatchEvent
   */
  this.dispatchEvent = function (e) {
    if (!e) {
      return true;
    }

    if (this.debug) {
      console.debug(e);
    }

    e.source = this;

    var onHandler = "on" + e.type;
    if (this.hasOwnProperty(onHandler)) {
      this[onHandler].call(this, e);
      if (e.defaultPrevented) {
        return false;
      }
    }

    if (this.listeners[e.type]) {
      return this.listeners[e.type].every(function (callback) {
        callback(e);
        return !e.defaultPrevented;
      });
    }

    return true;
  };

  /** @private */
  this._setReadyState = function (state) {
    var event = new CustomEvent("readystatechange");
    event.readyState = state;
    this.readyState = state;
    this.dispatchEvent(event);
  };

  this._onStreamFailure = function (e) {
    var event = new CustomEvent("error");
    event.data = e.currentTarget.response;
    this.dispatchEvent(event);
    this.close();
  };

  this._onStreamAbort = function (e) {
    this.dispatchEvent(new CustomEvent("abort"));
    this.close();
  };

  /** @private */
  this._onStreamProgress = function (e) {
    if (!this.xhr) {
      return;
    }

    if (this.xhr.status !== 200) {
      this._onStreamFailure(e);
      return;
    }

    if (this.readyState == this.CONNECTING) {
      this.dispatchEvent(new CustomEvent("open"));
      this._setReadyState(this.OPEN);
    }

    var data = this.xhr.responseText.substring(this.progress);

    this.progress += data.length;
    var parts = (this.chunk + data).split(/(\r\n\r\n|\r\r|\n\n)/g);

    // we assume that the last chunk can be incomplete because of buffering or other network effects
    // so we always save the last part to merge it with the next incoming packet
    var lastPart = parts.pop();
    parts.forEach(
      function (part) {
        if (part.trim().length > 0) {
          this.dispatchEvent(this._parseEventChunk(part));
        }
      }.bind(this)
    );
    this.chunk = lastPart;
  };

  /** @private */
  this._onStreamLoaded = function (e) {
    this._onStreamProgress(e);

    // Parse the last chunk.
    this.dispatchEvent(this._parseEventChunk(this.chunk));
    this.chunk = "";
  };

  /**
   * Parse a received SSE event chunk into a constructed event object.
   *
   * Reference: https://html.spec.whatwg.org/multipage/server-sent-events.html#dispatchMessage
   */
  this._parseEventChunk = function (chunk) {
    if (!chunk || chunk.length === 0) {
      return null;
    }

    if (this.debug) {
      console.debug(chunk);
    }

    var e = { id: null, retry: null, data: null, event: null };
    chunk.split(/\n|\r\n|\r/).forEach(
      function (line) {
        var index = line.indexOf(this.FIELD_SEPARATOR);
        var field, value;
        if (index > 0) {
          // only first whitespace should be trimmed
          var skip = line[index + 1] === " " ? 2 : 1;
          field = line.substring(0, index);
          value = line.substring(index + skip);
        } else if (index < 0) {
          // Interpret the entire line as the field name, and use the empty string as the field value
          field = line;
          value = "";
        } else {
          // A colon is the first character. This is a comment; ignore it.
          return;
        }

        if (!(field in e)) {
          return;
        }

        // consecutive 'data' is concatenated with newlines
        if (field === "data" && e[field] !== null) {
          e["data"] += "\n" + value;
        } else {
          e[field] = value;
        }
      }.bind(this)
    );

    var event = new CustomEvent(e.event || "message");
    event.data = e.data || "";
    event.id = e.id;
    return event;
  };

  this._checkStreamClosed = function () {
    if (!this.xhr) {
      return;
    }

    if (this.xhr.readyState === XMLHttpRequest.DONE) {
      this._setReadyState(this.CLOSED);
    }
  };

  /**
   * starts the streaming
   * @type Stream
   * @return {void}
   */
  this.stream = function () {
    if (this.xhr) {
      // Already connected.
      return;
    }

    this._setReadyState(this.CONNECTING);

    this.xhr = new XMLHttpRequest();
    this.xhr.addEventListener("progress", this._onStreamProgress.bind(this));
    this.xhr.addEventListener("load", this._onStreamLoaded.bind(this));
    this.xhr.addEventListener(
      "readystatechange",
      this._checkStreamClosed.bind(this)
    );
    this.xhr.addEventListener("error", this._onStreamFailure.bind(this));
    this.xhr.addEventListener("abort", this._onStreamAbort.bind(this));
    this.xhr.open(this.method, this.url);
    for (var header in this.headers) {
      this.xhr.setRequestHeader(header, this.headers[header]);
    }
    this.xhr.withCredentials = this.withCredentials;
    this.xhr.send(this.payload);
  };

  /**
   * closes the stream
   * @type Close
   * @return {void}
   */
  this.close = function () {
    if (this.readyState === this.CLOSED) {
      return;
    }

    this.xhr.abort();
    this.xhr = null;
    this._setReadyState(this.CLOSED);
  };

  if (options.start === undefined || options.start) {
    this.stream();
  }
};

// END of SSE code

let show;
browser.storage.local.get("visible").then(onGotShow, onErrorShow);

const cache = {};

const OPENAI_API_KEY = "sk-Skynet-openchatKEY";
const OPENAI_API_ENDPOINT = "https://chatapi.thele.me/v1/chat/completions";

const chatToggle = document.getElementById("chat-toggle");
const chatWidget = document.getElementById("chat-widget");
const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSendButton = document.getElementById("chat-send");

let chatVisible = false;
let introMessageSent = false;
let answer = "";
let history = [];
browser.storage.local.get("hist").then(onGotHist, onErrorHist);

chatToggle.addEventListener("click", () => {
  chatVisible = !chatVisible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
});

function toggleGeppetto() {
  console.log("show 1: " + show);
  chatVisible = !chatVisible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
  chatInput.focus();
  show = !show;
  console.log("show 2: " + show);
  browser.storage.local.set({ visible: show });
}

if (!show) {
  console.log("show KO" + show);
} else {
  console.log("show ok" + show);
}

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const userInput = chatInput.value.trim();
    if (userInput) {
      addChatMessage("You", userInput);
      history.push({ role: "user", content: userInput });
      browser.storage.local.set({ hist: JSON.stringify(history) });
      sendChatMessage(userInput);
      chatInput.value = "";
    }
  }
});

chatInput.addEventListener("drop", (event) => {
  event.preventDefault();
  event.target.value = event.dataTransfer.getData("text");
  const userInput = chatInput.value.trim();
  if (userInput) {
    addChatMessage("You", userInput);
    sendChatMessage(userInput);
    chatInput.value = "";
  }
});

chatSendButton.addEventListener("click", () => {
  const userInput = chatInput.value.trim();
  if (userInput) {
    addChatMessage("You", userInput);
    history.push({ role: "user", content: userInput });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    sendChatMessage(userInput);
    chatInput.value = "";
  }
});

function addChatMessage(sender, message) {
  const messageContainer = document.createElement("div");
  messageContainer.classList.add("chat-message-container");
  const messageHeader = document.createElement("div");
  messageHeader.classList.add("chat-message-header");
  messageHeader.textContent = sender + ":";
  const messageBody = document.createElement("div");
  messageBody.classList.add("chat-message-body");
  messageBody.innerHTML = message;
  messageContainer.appendChild(messageHeader);
  messageContainer.appendChild(messageBody);
  chatMessages.appendChild(messageContainer);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendChatElement(token) {
  const listMessageBody = document.querySelectorAll(".chat-message-body");
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
  chatMessages.scrollTop = chatMessages.scrollHeight;
  answer = answer + token;
}

async function sendChatMessage(message) {
  answer = "";
  const sendBtn = document.getElementById("chat-send");
  const sendInput = document.getElementById("chat-input");
  const loadingElement = document.getElementById("loading");
  sendBtn.disabled = true;
  sendInput.disabled = true;

  if (document.querySelectorAll(".chat-message-body").length == 0) {
    addChatMessage("You", message.replace("??", ""));
    history.push({ role: "user", content: message.replace("??", "") });
    browser.storage.local.set({ hist: JSON.stringify(history) });
  }

  let text = "";

  addChatMessage("ChatGeppetto", "");

  if (message.startsWith("http://") || message.startsWith("https://")) {
    await fetch(message, { origin: "https://searx.thele.me" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}`);
        }
        console.log(response);
        return response.text();
      })
      .then((html) => {
        var doc = new DOMParser().parseFromString(html, "text/html");
        elementList = doc.querySelectorAll(["p", "h1", "h2", "h3", "h4", "h5"]);
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
    const listMessageBody = document.querySelectorAll(".chat-message-body");
    const messageBody = listMessageBody.item(listMessageBody.length - 1);
    messageBody.innerHTML = "";
    history.push({
      role: "user",
      content:
        "Fait un court résumé dans la même langue du texte suivant:\n\n----------\n\n" +
        text +
        "\n\n----------\n\n Fait ce court résumé dans la langue du text, en étant très bref et en utilisant du markdown pour rendre le résumé plus lisible.",
    });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    sendBtn.disabled = false;
    sendInput.disabled = false;
    sendInput.focus();
  } else if (message == "/clear") {
    history = [];
    browser.storage.local.set({ hist: JSON.stringify(history) });
    addChatMessage("ChatGeppetto", "New chat started.");
    sendBtn.disabled = false;
    sendInput.disabled = false;
    sendInput.focus();
    return;
  }
  var source = new SSE(OPENAI_API_ENDPOINT, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    payload: JSON.stringify({
      messages: history,
      mode: "chat",
      instruction_template: "Alpaca",
      character: "ChatGeppetto_searx",
      stream: true,
      temperature: 0.7,
    }),
  });
  source.addEventListener("message", function (e) {
    // Assuming we receive JSON-encoded data payloads:
    try {
      var payload = JSON.parse(e.data);
    } catch (e) {
      console.log(e);
      //const listMessageBody = document.querySelectorAll(".chat-message-body");
      //const messageBody = listMessageBody.item(listMessageBody.length - 1);
      //var converter = new showdown.Converter();
      //converter.setFlavor("github");
      //var html = converter.makeHtml(answer);
      //messageBody.innerHTML = html;
      //chatMessages.scrollTop = chatMessages.scrollHeight;
      //history.push({ role: "assistant", content: answer });
      //browser.storage.local.set({ hist: JSON.stringify(history) });
      //sendBtn.disabled = false;
      //sendInput.disabled = false;
      //sendInput.focus();
    }
    if (payload.choices[0].finish_reason != "stop") {
      const chatbotResponseElement = payload.choices[0].delta.content;
      appendChatElement(chatbotResponseElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
      const listMessageBody = document.querySelectorAll(".chat-message-body");
      const messageBody = listMessageBody.item(listMessageBody.length - 1);
      var converter = new showdown.Converter();
      converter.setFlavor("github");
      var html = converter.makeHtml(answer);
      messageBody.innerHTML = html;
      chatMessages.scrollTop = chatMessages.scrollHeight;
      history.push({ role: "assistant", content: answer });
      browser.storage.local.set({ hist: JSON.stringify(history) });
      sendBtn.disabled = false;
      sendInput.disabled = false;
      sendInput.focus();
    }
  });
}

/*! showdown v 2.1.0 - 21-04-2022 */
!function () {
  function a(e) {
    "use strict";
    var r = {
      omitExtraWLInCodeBlocks: {
        defaultValue: !1,
        describe: "Omit the default extra whiteline added to code blocks",
        type: "boolean",
      },
      noHeaderId: {
        defaultValue: !1,
        describe: "Turn on/off generated header id",
        type: "boolean",
      },
      prefixHeaderId: {
        defaultValue: !1,
        describe:
          "Add a prefix to the generated header ids. Passing a string will prefix that string to the header id. Setting to true will add a generic 'section-' prefix",
        type: "string",
      },
      rawPrefixHeaderId: {
        defaultValue: !1,
        describe:
          'Setting this option to true will prevent showdown from modifying the prefix. This might result in malformed IDs (if, for instance, the " char is used in the prefix)',
        type: "boolean",
      },
      ghCompatibleHeaderId: {
        defaultValue: !1,
        describe:
          "Generate header ids compatible with github style (spaces are replaced with dashes, a bunch of non alphanumeric chars are removed)",
        type: "boolean",
      },
      rawHeaderId: {
        defaultValue: !1,
        describe:
          "Remove only spaces, ' and \" from generated header ids (including prefixes), replacing them with dashes (-). WARNING: This might result in malformed ids",
        type: "boolean",
      },
      headerLevelStart: {
        defaultValue: !1,
        describe: "The header blocks level start",
        type: "integer",
      },
      parseImgDimensions: {
        defaultValue: !1,
        describe: "Turn on/off image dimension parsing",
        type: "boolean",
      },
      simplifiedAutoLink: {
        defaultValue: !1,
        describe: "Turn on/off GFM autolink style",
        type: "boolean",
      },
      excludeTrailingPunctuationFromURLs: {
        defaultValue: !1,
        describe:
          "Excludes trailing punctuation from links generated with autoLinking",
        type: "boolean",
      },
      literalMidWordUnderscores: {
        defaultValue: !1,
        describe: "Parse midword underscores as literal underscores",
        type: "boolean",
      },
      literalMidWordAsterisks: {
        defaultValue: !1,
        describe: "Parse midword asterisks as literal asterisks",
        type: "boolean",
      },
      strikethrough: {
        defaultValue: !1,
        describe: "Turn on/off strikethrough support",
        type: "boolean",
      },
      tables: {
        defaultValue: !1,
        describe: "Turn on/off tables support",
        type: "boolean",
      },
      tablesHeaderId: {
        defaultValue: !1,
        describe: "Add an id to table headers",
        type: "boolean",
      },
      ghCodeBlocks: {
        defaultValue: !0,
        describe: "Turn on/off GFM fenced code blocks support",
        type: "boolean",
      },
      tasklists: {
        defaultValue: !1,
        describe: "Turn on/off GFM tasklist support",
        type: "boolean",
      },
      smoothLivePreview: {
        defaultValue: !1,
        describe:
          "Prevents weird effects in live previews due to incomplete input",
        type: "boolean",
      },
      smartIndentationFix: {
        defaultValue: !1,
        describe: "Tries to smartly fix indentation in es6 strings",
        type: "boolean",
      },
      disableForced4SpacesIndentedSublists: {
        defaultValue: !1,
        describe:
          "Disables the requirement of indenting nested sublists by 4 spaces",
        type: "boolean",
      },
      simpleLineBreaks: {
        defaultValue: !1,
        describe: "Parses simple line breaks as <br> (GFM Style)",
        type: "boolean",
      },
      requireSpaceBeforeHeadingText: {
        defaultValue: !1,
        describe:
          "Makes adding a space between `#` and the header text mandatory (GFM Style)",
        type: "boolean",
      },
      ghMentions: {
        defaultValue: !1,
        describe: "Enables github @mentions",
        type: "boolean",
      },
      ghMentionsLink: {
        defaultValue: "https://github.com/{u}",
        describe:
          "Changes the link generated by @mentions. Only applies if ghMentions option is enabled.",
        type: "string",
      },
      encodeEmails: {
        defaultValue: !0,
        describe:
          "Encode e-mail addresses through the use of Character Entities, transforming ASCII e-mail addresses into its equivalent decimal entities",
        type: "boolean",
      },
      openLinksInNewWindow: {
        defaultValue: !1,
        describe: "Open all links in new windows",
        type: "boolean",
      },
      backslashEscapesHTMLTags: {
        defaultValue: !1,
        describe: "Support for HTML Tag escaping. ex: <div>foo</div>",
        type: "boolean",
      },
      emoji: {
        defaultValue: !1,
        describe: "Enable emoji support. Ex: `this is a :smile: emoji`",
        type: "boolean",
      },
      underline: {
        defaultValue: !1,
        describe:
          "Enable support for underline. Syntax is double or triple underscores: `__underline word__`. With this option enabled, underscores no longer parses into `<em>` and `<strong>`",
        type: "boolean",
      },
      ellipsis: {
        defaultValue: !0,
        describe: "Replaces three dots with the ellipsis unicode character",
        type: "boolean",
      },
      completeHTMLDocument: {
        defaultValue: !1,
        describe:
          "Outputs a complete html document, including `<html>`, `<head>` and `<body>` tags",
        type: "boolean",
      },
      metadata: {
        defaultValue: !1,
        describe:
          "Enable support for document metadata (defined at the top of the document between `Â«Â«Â«` and `Â»Â»Â»` or between `---` and `---`).",
        type: "boolean",
      },
      splitAdjacentBlockquotes: {
        defaultValue: !1,
        describe: "Split adjacent blockquote blocks",
        type: "boolean",
      },
    };
    if (!1 === e) return JSON.parse(JSON.stringify(r));
    var t,
      a = {};
    for (t in r) r.hasOwnProperty(t) && (a[t] = r[t].defaultValue);
    return a;
  }
  var x = {},
    t = {},
    d = {},
    p = a(!0),
    h = "vanilla",
    _ = {
      github: {
        omitExtraWLInCodeBlocks: !0,
        simplifiedAutoLink: !0,
        excludeTrailingPunctuationFromURLs: !0,
        literalMidWordUnderscores: !0,
        strikethrough: !0,
        tables: !0,
        tablesHeaderId: !0,
        ghCodeBlocks: !0,
        tasklists: !0,
        disableForced4SpacesIndentedSublists: !0,
        simpleLineBreaks: !0,
        requireSpaceBeforeHeadingText: !0,
        ghCompatibleHeaderId: !0,
        ghMentions: !0,
        backslashEscapesHTMLTags: !0,
        emoji: !0,
        splitAdjacentBlockquotes: !0,
      },
      original: { noHeaderId: !0, ghCodeBlocks: !1 },
      ghost: {
        omitExtraWLInCodeBlocks: !0,
        parseImgDimensions: !0,
        simplifiedAutoLink: !0,
        excludeTrailingPunctuationFromURLs: !0,
        literalMidWordUnderscores: !0,
        strikethrough: !0,
        tables: !0,
        tablesHeaderId: !0,
        ghCodeBlocks: !0,
        tasklists: !0,
        smoothLivePreview: !0,
        simpleLineBreaks: !0,
        requireSpaceBeforeHeadingText: !0,
        ghMentions: !1,
        encodeEmails: !0,
      },
      vanilla: a(!0),
      allOn: (function () {
        "use strict";
        var e,
          r = a(!0),
          t = {};
        for (e in r) r.hasOwnProperty(e) && (t[e] = !0);
        return t;
      })(),
    };
  function g(e, r) {
    "use strict";
    var t = r ? "Error in " + r + " extension->" : "Error in unnamed extension",
      a = { valid: !0, error: "" };
    x.helper.isArray(e) || (e = [e]);
    for (var n = 0; n < e.length; ++n) {
      var s = t + " sub-extension " + n + ": ",
        o = e[n];
      if ("object" != typeof o)
        return (
          (a.valid = !1),
          (a.error = s + "must be an object, but " + typeof o + " given"),
          a
        );
      if (!x.helper.isString(o.type))
        return (
          (a.valid = !1),
          (a.error =
            s +
            'property "type" must be a string, but ' +
            typeof o.type +
            " given"),
          a
        );
      var i = (o.type = o.type.toLowerCase());
      if (
        "lang" !==
          (i =
            "html" === (i = "language" === i ? (o.type = "lang") : i)
              ? (o.type = "output")
              : i) &&
        "output" !== i &&
        "listener" !== i
      )
        return (
          (a.valid = !1),
          (a.error =
            s +
            "type " +
            i +
            ' is not recognized. Valid values: "lang/language", "output/html" or "listener"'),
          a
        );
      if ("listener" === i) {
        if (x.helper.isUndefined(o.listeners))
          return (
            (a.valid = !1),
            (a.error =
              s +
              '. Extensions of type "listener" must have a property called "listeners"'),
            a
          );
      } else if (
        x.helper.isUndefined(o.filter) &&
        x.helper.isUndefined(o.regex)
      )
        return (
          (a.valid = !1),
          (a.error =
            s +
            i +
            ' extensions must define either a "regex" property or a "filter" method'),
          a
        );
      if (o.listeners) {
        if ("object" != typeof o.listeners)
          return (
            (a.valid = !1),
            (a.error =
              s +
              '"listeners" property must be an object but ' +
              typeof o.listeners +
              " given"),
            a
          );
        for (var l in o.listeners)
          if (
            o.listeners.hasOwnProperty(l) &&
            "function" != typeof o.listeners[l]
          )
            return (
              (a.valid = !1),
              (a.error =
                s +
                '"listeners" property must be an hash of [event name]: [callback]. listeners.' +
                l +
                " must be a function but " +
                typeof o.listeners[l] +
                " given"),
              a
            );
      }
      if (o.filter) {
        if ("function" != typeof o.filter)
          return (
            (a.valid = !1),
            (a.error =
              s +
              '"filter" must be a function, but ' +
              typeof o.filter +
              " given"),
            a
          );
      } else if (o.regex) {
        if (
          (x.helper.isString(o.regex) && (o.regex = new RegExp(o.regex, "g")),
          !(o.regex instanceof RegExp))
        )
          return (
            (a.valid = !1),
            (a.error =
              s +
              '"regex" property must either be a string or a RegExp object, but ' +
              typeof o.regex +
              " given"),
            a
          );
        if (x.helper.isUndefined(o.replace))
          return (
            (a.valid = !1),
            (a.error =
              s +
              '"regex" extensions must implement a replace string or function'),
            a
          );
      }
    }
    return a;
  }
  function n(e, r) {
    "use strict";
    return "Â¨E" + r.charCodeAt(0) + "E";
  }
  (x.helper = {}),
    (x.extensions = {}),
    (x.setOption = function (e, r) {
      "use strict";
      return (p[e] = r), this;
    }),
    (x.getOption = function (e) {
      "use strict";
      return p[e];
    }),
    (x.getOptions = function () {
      "use strict";
      return p;
    }),
    (x.resetOptions = function () {
      "use strict";
      p = a(!0);
    }),
    (x.setFlavor = function (e) {
      "use strict";
      if (!_.hasOwnProperty(e)) throw Error(e + " flavor was not found");
      x.resetOptions();
      var r,
        t = _[e];
      for (r in ((h = e), t)) t.hasOwnProperty(r) && (p[r] = t[r]);
    }),
    (x.getFlavor = function () {
      "use strict";
      return h;
    }),
    (x.getFlavorOptions = function (e) {
      "use strict";
      if (_.hasOwnProperty(e)) return _[e];
    }),
    (x.getDefaultOptions = a),
    (x.subParser = function (e, r) {
      "use strict";
      if (x.helper.isString(e)) {
        if (void 0 === r) {
          if (t.hasOwnProperty(e)) return t[e];
          throw Error("SubParser named " + e + " not registered!");
        }
        t[e] = r;
      }
    }),
    (x.extension = function (e, r) {
      "use strict";
      if (!x.helper.isString(e))
        throw Error("Extension 'name' must be a string");
      if (((e = x.helper.stdExtName(e)), x.helper.isUndefined(r))) {
        if (d.hasOwnProperty(e)) return d[e];
        throw Error("Extension named " + e + " is not registered!");
      }
      "function" == typeof r && (r = r());
      var t = g((r = x.helper.isArray(r) ? r : [r]), e);
      if (!t.valid) throw Error(t.error);
      d[e] = r;
    }),
    (x.getAllExtensions = function () {
      "use strict";
      return d;
    }),
    (x.removeExtension = function (e) {
      "use strict";
      delete d[e];
    }),
    (x.resetExtensions = function () {
      "use strict";
      d = {};
    }),
    (x.validateExtension = function (e) {
      "use strict";
      e = g(e, null);
      return !!e.valid || (console.warn(e.error), !1);
    }),
    x.hasOwnProperty("helper") || (x.helper = {}),
    (x.helper.isString = function (e) {
      "use strict";
      return "string" == typeof e || e instanceof String;
    }),
    (x.helper.isFunction = function (e) {
      "use strict";
      return e && "[object Function]" === {}.toString.call(e);
    }),
    (x.helper.isArray = function (e) {
      "use strict";
      return Array.isArray(e);
    }),
    (x.helper.isUndefined = function (e) {
      "use strict";
      return void 0 === e;
    }),
    (x.helper.forEach = function (e, r) {
      "use strict";
      if (x.helper.isUndefined(e)) throw new Error("obj param is required");
      if (x.helper.isUndefined(r))
        throw new Error("callback param is required");
      if (!x.helper.isFunction(r))
        throw new Error("callback param must be a function/closure");
      if ("function" == typeof e.forEach) e.forEach(r);
      else if (x.helper.isArray(e))
        for (var t = 0; t < e.length; t++) r(e[t], t, e);
      else {
        if ("object" != typeof e)
          throw new Error(
            "obj does not seem to be an array or an iterable object"
          );
        for (var a in e) e.hasOwnProperty(a) && r(e[a], a, e);
      }
    }),
    (x.helper.stdExtName = function (e) {
      "use strict";
      return e
        .replace(/[_?*+\/\\.^-]/g, "")
        .replace(/\s/g, "")
        .toLowerCase();
    }),
    (x.helper.escapeCharactersCallback = n),
    (x.helper.escapeCharacters = function (e, r, t) {
      "use strict";
      (r = "([" + r.replace(/([\[\]\\])/g, "\\$1") + "])"),
        t && (r = "\\\\" + r),
        (t = new RegExp(r, "g"));
      return (e = e.replace(t, n));
    }),
    (x.helper.unescapeHTMLEntities = function (e) {
      "use strict";
      return e
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
    });
  function u(e, r, t, a) {
    "use strict";
    var n,
      s,
      o,
      i = -1 < (a = a || "").indexOf("g"),
      l = new RegExp(r + "|" + t, "g" + a.replace(/g/g, "")),
      c = new RegExp(r, a.replace(/g/g, "")),
      u = [];
    do {
      for (n = 0; (p = l.exec(e)); )
        if (c.test(p[0])) n++ || (o = (s = l.lastIndex) - p[0].length);
        else if (n && !--n) {
          var d = p.index + p[0].length,
            p = {
              left: { start: o, end: s },
              match: { start: s, end: p.index },
              right: { start: p.index, end: d },
              wholeMatch: { start: o, end: d },
            };
          if ((u.push(p), !i)) return u;
        }
    } while (n && (l.lastIndex = s));
    return u;
  }
  function s(u) {
    "use strict";
    return function (e, r, t, a, n, s, o) {
      var i = (t = t.replace(
          x.helper.regexes.asteriskDashAndColon,
          x.helper.escapeCharactersCallback
        )),
        l = "",
        c = "",
        r = r || "",
        o = o || "";
      return (
        /^www\./i.test(t) && (t = t.replace(/^www\./i, "http://www.")),
        u.excludeTrailingPunctuationFromURLs && s && (l = s),
        r +
          '<a href="' +
          t +
          '"' +
          (c = u.openLinksInNewWindow
            ? ' rel="noopener noreferrer" target="Â¨E95Eblank"'
            : c) +
          ">" +
          i +
          "</a>" +
          l +
          o
      );
    };
  }
  function o(n, s) {
    "use strict";
    return function (e, r, t) {
      var a = "mailto:";
      return (
        (r = r || ""),
        (t = x.subParser("unescapeSpecialChars")(t, n, s)),
        n.encodeEmails
          ? ((a = x.helper.encodeEmailAddress(a + t)),
            (t = x.helper.encodeEmailAddress(t)))
          : (a += t),
        r + '<a href="' + a + '">' + t + "</a>"
      );
    };
  }
  (x.helper.matchRecursiveRegExp = function (e, r, t, a) {
    "use strict";
    for (var n = u(e, r, t, a), s = [], o = 0; o < n.length; ++o)
      s.push([
        e.slice(n[o].wholeMatch.start, n[o].wholeMatch.end),
        e.slice(n[o].match.start, n[o].match.end),
        e.slice(n[o].left.start, n[o].left.end),
        e.slice(n[o].right.start, n[o].right.end),
      ]);
    return s;
  }),
    (x.helper.replaceRecursiveRegExp = function (e, r, t, a, n) {
      "use strict";
      x.helper.isFunction(r) ||
        ((s = r),
        (r = function () {
          return s;
        }));
      var s,
        o = u(e, t, a, n),
        t = e,
        i = o.length;
      if (0 < i) {
        var l = [];
        0 !== o[0].wholeMatch.start &&
          l.push(e.slice(0, o[0].wholeMatch.start));
        for (var c = 0; c < i; ++c)
          l.push(
            r(
              e.slice(o[c].wholeMatch.start, o[c].wholeMatch.end),
              e.slice(o[c].match.start, o[c].match.end),
              e.slice(o[c].left.start, o[c].left.end),
              e.slice(o[c].right.start, o[c].right.end)
            )
          ),
            c < i - 1 &&
              l.push(e.slice(o[c].wholeMatch.end, o[c + 1].wholeMatch.start));
        o[i - 1].wholeMatch.end < e.length &&
          l.push(e.slice(o[i - 1].wholeMatch.end)),
          (t = l.join(""));
      }
      return t;
    }),
    (x.helper.regexIndexOf = function (e, r, t) {
      "use strict";
      if (!x.helper.isString(e))
        throw "InvalidArgumentError: first parameter of showdown.helper.regexIndexOf function must be a string";
      if (r instanceof RegExp == !1)
        throw "InvalidArgumentError: second parameter of showdown.helper.regexIndexOf function must be an instance of RegExp";
      e = e.substring(t || 0).search(r);
      return 0 <= e ? e + (t || 0) : e;
    }),
    (x.helper.splitAtIndex = function (e, r) {
      "use strict";
      if (x.helper.isString(e)) return [e.substring(0, r), e.substring(r)];
      throw "InvalidArgumentError: first parameter of showdown.helper.regexIndexOf function must be a string";
    }),
    (x.helper.encodeEmailAddress = function (e) {
      "use strict";
      var t = [
        function (e) {
          return "&#" + e.charCodeAt(0) + ";";
        },
        function (e) {
          return "&#x" + e.charCodeAt(0).toString(16) + ";";
        },
        function (e) {
          return e;
        },
      ];
      return (e = e.replace(/./g, function (e) {
        var r;
        return (e =
          "@" === e
            ? t[Math.floor(2 * Math.random())](e)
            : 0.9 < (r = Math.random())
            ? t[2](e)
            : 0.45 < r
            ? t[1](e)
            : t[0](e));
      }));
    }),
    (x.helper.padEnd = function (e, r, t) {
      "use strict";
      return (
        (r >>= 0),
        (t = String(t || " ")),
        e.length > r
          ? String(e)
          : ((r -= e.length) > t.length && (t += t.repeat(r / t.length)),
            String(e) + t.slice(0, r))
      );
    }),
    "undefined" == typeof console &&
      (console = {
        warn: function (e) {
          "use strict";
          alert(e);
        },
        log: function (e) {
          "use strict";
          alert(e);
        },
        error: function (e) {
          "use strict";
          throw e;
        },
      }),
    (x.helper.regexes = { asteriskDashAndColon: /([*_:~])/g }),
    (x.helper.emojis = {
      "+1": "ðŸ‘",
      "-1": "ðŸ‘Ž",
      100: "ðŸ’¯",
      1234: "ðŸ”¢",
      "1st_place_medal": "ðŸ¥‡",
      "2nd_place_medal": "ðŸ¥ˆ",
      "3rd_place_medal": "ðŸ¥‰",
      "8ball": "ðŸŽ±",
      a: "ðŸ…°ï¸",
      ab: "ðŸ†Ž",
      abc: "ðŸ”¤",
      abcd: "ðŸ”¡",
      accept: "ðŸ‰‘",
      aerial_tramway: "ðŸš¡",
      airplane: "âœˆï¸",
      alarm_clock: "â°",
      alembic: "âš—ï¸",
      alien: "ðŸ‘½",
      ambulance: "ðŸš‘",
      amphora: "ðŸº",
      anchor: "âš“ï¸",
      angel: "ðŸ‘¼",
      anger: "ðŸ’¢",
      angry: "ðŸ˜ ",
      anguished: "ðŸ˜§",
      ant: "ðŸœ",
      apple: "ðŸŽ",
      aquarius: "â™’ï¸",
      aries: "â™ˆï¸",
      arrow_backward: "â—€ï¸",
      arrow_double_down: "â¬",
      arrow_double_up: "â«",
      arrow_down: "â¬‡ï¸",
      arrow_down_small: "ðŸ”½",
      arrow_forward: "â–¶ï¸",
      arrow_heading_down: "â¤µï¸",
      arrow_heading_up: "â¤´ï¸",
      arrow_left: "â¬…ï¸",
      arrow_lower_left: "â†™ï¸",
      arrow_lower_right: "â†˜ï¸",
      arrow_right: "âž¡ï¸",
      arrow_right_hook: "â†ªï¸",
      arrow_up: "â¬†ï¸",
      arrow_up_down: "â†•ï¸",
      arrow_up_small: "ðŸ”¼",
      arrow_upper_left: "â†–ï¸",
      arrow_upper_right: "â†—ï¸",
      arrows_clockwise: "ðŸ”ƒ",
      arrows_counterclockwise: "ðŸ”„",
      art: "ðŸŽ¨",
      articulated_lorry: "ðŸš›",
      artificial_satellite: "ðŸ›°",
      astonished: "ðŸ˜²",
      athletic_shoe: "ðŸ‘Ÿ",
      atm: "ðŸ§",
      atom_symbol: "âš›ï¸",
      avocado: "ðŸ¥‘",
      b: "ðŸ…±ï¸",
      baby: "ðŸ‘¶",
      baby_bottle: "ðŸ¼",
      baby_chick: "ðŸ¤",
      baby_symbol: "ðŸš¼",
      back: "ðŸ”™",
      bacon: "ðŸ¥“",
      badminton: "ðŸ¸",
      baggage_claim: "ðŸ›„",
      baguette_bread: "ðŸ¥–",
      balance_scale: "âš–ï¸",
      balloon: "ðŸŽˆ",
      ballot_box: "ðŸ—³",
      ballot_box_with_check: "â˜‘ï¸",
      bamboo: "ðŸŽ",
      banana: "ðŸŒ",
      bangbang: "â€¼ï¸",
      bank: "ðŸ¦",
      bar_chart: "ðŸ“Š",
      barber: "ðŸ’ˆ",
      baseball: "âš¾ï¸",
      basketball: "ðŸ€",
      basketball_man: "â›¹ï¸",
      basketball_woman: "â›¹ï¸&zwj;â™€ï¸",
      bat: "ðŸ¦‡",
      bath: "ðŸ›€",
      bathtub: "ðŸ›",
      battery: "ðŸ”‹",
      beach_umbrella: "ðŸ–",
      bear: "ðŸ»",
      bed: "ðŸ›",
      bee: "ðŸ",
      beer: "ðŸº",
      beers: "ðŸ»",
      beetle: "ðŸž",
      beginner: "ðŸ”°",
      bell: "ðŸ””",
      bellhop_bell: "ðŸ›Ž",
      bento: "ðŸ±",
      biking_man: "ðŸš´",
      bike: "ðŸš²",
      biking_woman: "ðŸš´&zwj;â™€ï¸",
      bikini: "ðŸ‘™",
      biohazard: "â˜£ï¸",
      bird: "ðŸ¦",
      birthday: "ðŸŽ‚",
      black_circle: "âš«ï¸",
      black_flag: "ðŸ´",
      black_heart: "ðŸ–¤",
      black_joker: "ðŸƒ",
      black_large_square: "â¬›ï¸",
      black_medium_small_square: "â—¾ï¸",
      black_medium_square: "â—¼ï¸",
      black_nib: "âœ’ï¸",
      black_small_square: "â–ªï¸",
      black_square_button: "ðŸ”²",
      blonde_man: "ðŸ‘±",
      blonde_woman: "ðŸ‘±&zwj;â™€ï¸",
      blossom: "ðŸŒ¼",
      blowfish: "ðŸ¡",
      blue_book: "ðŸ“˜",
      blue_car: "ðŸš™",
      blue_heart: "ðŸ’™",
      blush: "ðŸ˜Š",
      boar: "ðŸ—",
      boat: "â›µï¸",
      bomb: "ðŸ’£",
      book: "ðŸ“–",
      bookmark: "ðŸ”–",
      bookmark_tabs: "ðŸ“‘",
      books: "ðŸ“š",
      boom: "ðŸ’¥",
      boot: "ðŸ‘¢",
      bouquet: "ðŸ’",
      bowing_man: "ðŸ™‡",
      bow_and_arrow: "ðŸ¹",
      bowing_woman: "ðŸ™‡&zwj;â™€ï¸",
      bowling: "ðŸŽ³",
      boxing_glove: "ðŸ¥Š",
      boy: "ðŸ‘¦",
      bread: "ðŸž",
      bride_with_veil: "ðŸ‘°",
      bridge_at_night: "ðŸŒ‰",
      briefcase: "ðŸ’¼",
      broken_heart: "ðŸ’”",
      bug: "ðŸ›",
      building_construction: "ðŸ—",
      bulb: "ðŸ’¡",
      bullettrain_front: "ðŸš…",
      bullettrain_side: "ðŸš„",
      burrito: "ðŸŒ¯",
      bus: "ðŸšŒ",
      business_suit_levitating: "ðŸ•´",
      busstop: "ðŸš",
      bust_in_silhouette: "ðŸ‘¤",
      busts_in_silhouette: "ðŸ‘¥",
      butterfly: "ðŸ¦‹",
      cactus: "ðŸŒµ",
      cake: "ðŸ°",
      calendar: "ðŸ“†",
      call_me_hand: "ðŸ¤™",
      calling: "ðŸ“²",
      camel: "ðŸ«",
      camera: "ðŸ“·",
      camera_flash: "ðŸ“¸",
      camping: "ðŸ•",
      cancer: "â™‹ï¸",
      candle: "ðŸ•¯",
      candy: "ðŸ¬",
      canoe: "ðŸ›¶",
      capital_abcd: "ðŸ” ",
      capricorn: "â™‘ï¸",
      car: "ðŸš—",
      card_file_box: "ðŸ—ƒ",
      card_index: "ðŸ“‡",
      card_index_dividers: "ðŸ—‚",
      carousel_horse: "ðŸŽ ",
      carrot: "ðŸ¥•",
      cat: "ðŸ±",
      cat2: "ðŸˆ",
      cd: "ðŸ’¿",
      chains: "â›“",
      champagne: "ðŸ¾",
      chart: "ðŸ’¹",
      chart_with_downwards_trend: "ðŸ“‰",
      chart_with_upwards_trend: "ðŸ“ˆ",
      checkered_flag: "ðŸ",
      cheese: "ðŸ§€",
      cherries: "ðŸ’",
      cherry_blossom: "ðŸŒ¸",
      chestnut: "ðŸŒ°",
      chicken: "ðŸ”",
      children_crossing: "ðŸš¸",
      chipmunk: "ðŸ¿",
      chocolate_bar: "ðŸ«",
      christmas_tree: "ðŸŽ„",
      church: "â›ªï¸",
      cinema: "ðŸŽ¦",
      circus_tent: "ðŸŽª",
      city_sunrise: "ðŸŒ‡",
      city_sunset: "ðŸŒ†",
      cityscape: "ðŸ™",
      cl: "ðŸ†‘",
      clamp: "ðŸ—œ",
      clap: "ðŸ‘",
      clapper: "ðŸŽ¬",
      classical_building: "ðŸ›",
      clinking_glasses: "ðŸ¥‚",
      clipboard: "ðŸ“‹",
      clock1: "ðŸ•",
      clock10: "ðŸ•™",
      clock1030: "ðŸ•¥",
      clock11: "ðŸ•š",
      clock1130: "ðŸ•¦",
      clock12: "ðŸ•›",
      clock1230: "ðŸ•§",
      clock130: "ðŸ•œ",
      clock2: "ðŸ•‘",
      clock230: "ðŸ•",
      clock3: "ðŸ•’",
      clock330: "ðŸ•ž",
      clock4: "ðŸ•“",
      clock430: "ðŸ•Ÿ",
      clock5: "ðŸ•”",
      clock530: "ðŸ• ",
      clock6: "ðŸ••",
      clock630: "ðŸ•¡",
      clock7: "ðŸ•–",
      clock730: "ðŸ•¢",
      clock8: "ðŸ•—",
      clock830: "ðŸ•£",
      clock9: "ðŸ•˜",
      clock930: "ðŸ•¤",
      closed_book: "ðŸ“•",
      closed_lock_with_key: "ðŸ”",
      closed_umbrella: "ðŸŒ‚",
      cloud: "â˜ï¸",
      cloud_with_lightning: "ðŸŒ©",
      cloud_with_lightning_and_rain: "â›ˆ",
      cloud_with_rain: "ðŸŒ§",
      cloud_with_snow: "ðŸŒ¨",
      clown_face: "ðŸ¤¡",
      clubs: "â™£ï¸",
      cocktail: "ðŸ¸",
      coffee: "â˜•ï¸",
      coffin: "âš°ï¸",
      cold_sweat: "ðŸ˜°",
      comet: "â˜„ï¸",
      computer: "ðŸ’»",
      computer_mouse: "ðŸ–±",
      confetti_ball: "ðŸŽŠ",
      confounded: "ðŸ˜–",
      confused: "ðŸ˜•",
      congratulations: "ãŠ—ï¸",
      construction: "ðŸš§",
      construction_worker_man: "ðŸ‘·",
      construction_worker_woman: "ðŸ‘·&zwj;â™€ï¸",
      control_knobs: "ðŸŽ›",
      convenience_store: "ðŸª",
      cookie: "ðŸª",
      cool: "ðŸ†’",
      policeman: "ðŸ‘®",
      copyright: "Â©ï¸",
      corn: "ðŸŒ½",
      couch_and_lamp: "ðŸ›‹",
      couple: "ðŸ‘«",
      couple_with_heart_woman_man: "ðŸ’‘",
      couple_with_heart_man_man: "ðŸ‘¨&zwj;â¤ï¸&zwj;ðŸ‘¨",
      couple_with_heart_woman_woman: "ðŸ‘©&zwj;â¤ï¸&zwj;ðŸ‘©",
      couplekiss_man_man: "ðŸ‘¨&zwj;â¤ï¸&zwj;ðŸ’‹&zwj;ðŸ‘¨",
      couplekiss_man_woman: "ðŸ’",
      couplekiss_woman_woman: "ðŸ‘©&zwj;â¤ï¸&zwj;ðŸ’‹&zwj;ðŸ‘©",
      cow: "ðŸ®",
      cow2: "ðŸ„",
      cowboy_hat_face: "ðŸ¤ ",
      crab: "ðŸ¦€",
      crayon: "ðŸ–",
      credit_card: "ðŸ’³",
      crescent_moon: "ðŸŒ™",
      cricket: "ðŸ",
      crocodile: "ðŸŠ",
      croissant: "ðŸ¥",
      crossed_fingers: "ðŸ¤ž",
      crossed_flags: "ðŸŽŒ",
      crossed_swords: "âš”ï¸",
      crown: "ðŸ‘‘",
      cry: "ðŸ˜¢",
      crying_cat_face: "ðŸ˜¿",
      crystal_ball: "ðŸ”®",
      cucumber: "ðŸ¥’",
      cupid: "ðŸ’˜",
      curly_loop: "âž°",
      currency_exchange: "ðŸ’±",
      curry: "ðŸ›",
      custard: "ðŸ®",
      customs: "ðŸ›ƒ",
      cyclone: "ðŸŒ€",
      dagger: "ðŸ—¡",
      dancer: "ðŸ’ƒ",
      dancing_women: "ðŸ‘¯",
      dancing_men: "ðŸ‘¯&zwj;â™‚ï¸",
      dango: "ðŸ¡",
      dark_sunglasses: "ðŸ•¶",
      dart: "ðŸŽ¯",
      dash: "ðŸ’¨",
      date: "ðŸ“…",
      deciduous_tree: "ðŸŒ³",
      deer: "ðŸ¦Œ",
      department_store: "ðŸ¬",
      derelict_house: "ðŸš",
      desert: "ðŸœ",
      desert_island: "ðŸ",
      desktop_computer: "ðŸ–¥",
      male_detective: "ðŸ•µï¸",
      diamond_shape_with_a_dot_inside: "ðŸ’ ",
      diamonds: "â™¦ï¸",
      disappointed: "ðŸ˜ž",
      disappointed_relieved: "ðŸ˜¥",
      dizzy: "ðŸ’«",
      dizzy_face: "ðŸ˜µ",
      do_not_litter: "ðŸš¯",
      dog: "ðŸ¶",
      dog2: "ðŸ•",
      dollar: "ðŸ’µ",
      dolls: "ðŸŽŽ",
      dolphin: "ðŸ¬",
      door: "ðŸšª",
      doughnut: "ðŸ©",
      dove: "ðŸ•Š",
      dragon: "ðŸ‰",
      dragon_face: "ðŸ²",
      dress: "ðŸ‘—",
      dromedary_camel: "ðŸª",
      drooling_face: "ðŸ¤¤",
      droplet: "ðŸ’§",
      drum: "ðŸ¥",
      duck: "ðŸ¦†",
      dvd: "ðŸ“€",
      "e-mail": "ðŸ“§",
      eagle: "ðŸ¦…",
      ear: "ðŸ‘‚",
      ear_of_rice: "ðŸŒ¾",
      earth_africa: "ðŸŒ",
      earth_americas: "ðŸŒŽ",
      earth_asia: "ðŸŒ",
      egg: "ðŸ¥š",
      eggplant: "ðŸ†",
      eight_pointed_black_star: "âœ´ï¸",
      eight_spoked_asterisk: "âœ³ï¸",
      electric_plug: "ðŸ”Œ",
      elephant: "ðŸ˜",
      email: "âœ‰ï¸",
      end: "ðŸ”š",
      envelope_with_arrow: "ðŸ“©",
      euro: "ðŸ’¶",
      european_castle: "ðŸ°",
      european_post_office: "ðŸ¤",
      evergreen_tree: "ðŸŒ²",
      exclamation: "â—ï¸",
      expressionless: "ðŸ˜‘",
      eye: "ðŸ‘",
      eye_speech_bubble: "ðŸ‘&zwj;ðŸ—¨",
      eyeglasses: "ðŸ‘“",
      eyes: "ðŸ‘€",
      face_with_head_bandage: "ðŸ¤•",
      face_with_thermometer: "ðŸ¤’",
      fist_oncoming: "ðŸ‘Š",
      factory: "ðŸ­",
      fallen_leaf: "ðŸ‚",
      family_man_woman_boy: "ðŸ‘ª",
      family_man_boy: "ðŸ‘¨&zwj;ðŸ‘¦",
      family_man_boy_boy: "ðŸ‘¨&zwj;ðŸ‘¦&zwj;ðŸ‘¦",
      family_man_girl: "ðŸ‘¨&zwj;ðŸ‘§",
      family_man_girl_boy: "ðŸ‘¨&zwj;ðŸ‘§&zwj;ðŸ‘¦",
      family_man_girl_girl: "ðŸ‘¨&zwj;ðŸ‘§&zwj;ðŸ‘§",
      family_man_man_boy: "ðŸ‘¨&zwj;ðŸ‘¨&zwj;ðŸ‘¦",
      family_man_man_boy_boy: "ðŸ‘¨&zwj;ðŸ‘¨&zwj;ðŸ‘¦&zwj;ðŸ‘¦",
      family_man_man_girl: "ðŸ‘¨&zwj;ðŸ‘¨&zwj;ðŸ‘§",
      family_man_man_girl_boy: "ðŸ‘¨&zwj;ðŸ‘¨&zwj;ðŸ‘§&zwj;ðŸ‘¦",
      family_man_man_girl_girl: "ðŸ‘¨&zwj;ðŸ‘¨&zwj;ðŸ‘§&zwj;ðŸ‘§",
      family_man_woman_boy_boy: "ðŸ‘¨&zwj;ðŸ‘©&zwj;ðŸ‘¦&zwj;ðŸ‘¦",
      family_man_woman_girl: "ðŸ‘¨&zwj;ðŸ‘©&zwj;ðŸ‘§",
      family_man_woman_girl_boy: "ðŸ‘¨&zwj;ðŸ‘©&zwj;ðŸ‘§&zwj;ðŸ‘¦",
      family_man_woman_girl_girl: "ðŸ‘¨&zwj;ðŸ‘©&zwj;ðŸ‘§&zwj;ðŸ‘§",
      family_woman_boy: "ðŸ‘©&zwj;ðŸ‘¦",
      family_woman_boy_boy: "ðŸ‘©&zwj;ðŸ‘¦&zwj;ðŸ‘¦",
      family_woman_girl: "ðŸ‘©&zwj;ðŸ‘§",
      family_woman_girl_boy: "ðŸ‘©&zwj;ðŸ‘§&zwj;ðŸ‘¦",
      family_woman_girl_girl: "ðŸ‘©&zwj;ðŸ‘§&zwj;ðŸ‘§",
      family_woman_woman_boy: "ðŸ‘©&zwj;ðŸ‘©&zwj;ðŸ‘¦",
      family_woman_woman_boy_boy: "ðŸ‘©&zwj;ðŸ‘©&zwj;ðŸ‘¦&zwj;ðŸ‘¦",
      family_woman_woman_girl: "ðŸ‘©&zwj;ðŸ‘©&zwj;ðŸ‘§",
      family_woman_woman_girl_boy: "ðŸ‘©&zwj;ðŸ‘©&zwj;ðŸ‘§&zwj;ðŸ‘¦",
      family_woman_woman_girl_girl: "ðŸ‘©&zwj;ðŸ‘©&zwj;ðŸ‘§&zwj;ðŸ‘§",
      fast_forward: "â©",
      fax: "ðŸ“ ",
      fearful: "ðŸ˜¨",
      feet: "ðŸ¾",
      female_detective: "ðŸ•µï¸&zwj;â™€ï¸",
      ferris_wheel: "ðŸŽ¡",
      ferry: "â›´",
      field_hockey: "ðŸ‘",
      file_cabinet: "ðŸ—„",
      file_folder: "ðŸ“",
      film_projector: "ðŸ“½",
      film_strip: "ðŸŽž",
      fire: "ðŸ”¥",
      fire_engine: "ðŸš’",
      fireworks: "ðŸŽ†",
      first_quarter_moon: "ðŸŒ“",
      first_quarter_moon_with_face: "ðŸŒ›",
      fish: "ðŸŸ",
      fish_cake: "ðŸ¥",
      fishing_pole_and_fish: "ðŸŽ£",
      fist_raised: "âœŠ",
      fist_left: "ðŸ¤›",
      fist_right: "ðŸ¤œ",
      flags: "ðŸŽ",
      flashlight: "ðŸ”¦",
      fleur_de_lis: "âšœï¸",
      flight_arrival: "ðŸ›¬",
      flight_departure: "ðŸ›«",
      floppy_disk: "ðŸ’¾",
      flower_playing_cards: "ðŸŽ´",
      flushed: "ðŸ˜³",
      fog: "ðŸŒ«",
      foggy: "ðŸŒ",
      football: "ðŸˆ",
      footprints: "ðŸ‘£",
      fork_and_knife: "ðŸ´",
      fountain: "â›²ï¸",
      fountain_pen: "ðŸ–‹",
      four_leaf_clover: "ðŸ€",
      fox_face: "ðŸ¦Š",
      framed_picture: "ðŸ–¼",
      free: "ðŸ†“",
      fried_egg: "ðŸ³",
      fried_shrimp: "ðŸ¤",
      fries: "ðŸŸ",
      frog: "ðŸ¸",
      frowning: "ðŸ˜¦",
      frowning_face: "â˜¹ï¸",
      frowning_man: "ðŸ™&zwj;â™‚ï¸",
      frowning_woman: "ðŸ™",
      middle_finger: "ðŸ–•",
      fuelpump: "â›½ï¸",
      full_moon: "ðŸŒ•",
      full_moon_with_face: "ðŸŒ",
      funeral_urn: "âš±ï¸",
      game_die: "ðŸŽ²",
      gear: "âš™ï¸",
      gem: "ðŸ’Ž",
      gemini: "â™Šï¸",
      ghost: "ðŸ‘»",
      gift: "ðŸŽ",
      gift_heart: "ðŸ’",
      girl: "ðŸ‘§",
      globe_with_meridians: "ðŸŒ",
      goal_net: "ðŸ¥…",
      goat: "ðŸ",
      golf: "â›³ï¸",
      golfing_man: "ðŸŒï¸",
      golfing_woman: "ðŸŒï¸&zwj;â™€ï¸",
      gorilla: "ðŸ¦",
      grapes: "ðŸ‡",
      green_apple: "ðŸ",
      green_book: "ðŸ“—",
      green_heart: "ðŸ’š",
      green_salad: "ðŸ¥—",
      grey_exclamation: "â•",
      grey_question: "â”",
      grimacing: "ðŸ˜¬",
      grin: "ðŸ˜",
      grinning: "ðŸ˜€",
      guardsman: "ðŸ’‚",
      guardswoman: "ðŸ’‚&zwj;â™€ï¸",
      guitar: "ðŸŽ¸",
      gun: "ðŸ”«",
      haircut_woman: "ðŸ’‡",
      haircut_man: "ðŸ’‡&zwj;â™‚ï¸",
      hamburger: "ðŸ”",
      hammer: "ðŸ”¨",
      hammer_and_pick: "âš’",
      hammer_and_wrench: "ðŸ› ",
      hamster: "ðŸ¹",
      hand: "âœ‹",
      handbag: "ðŸ‘œ",
      handshake: "ðŸ¤",
      hankey: "ðŸ’©",
      hatched_chick: "ðŸ¥",
      hatching_chick: "ðŸ£",
      headphones: "ðŸŽ§",
      hear_no_evil: "ðŸ™‰",
      heart: "â¤ï¸",
      heart_decoration: "ðŸ’Ÿ",
      heart_eyes: "ðŸ˜",
      heart_eyes_cat: "ðŸ˜»",
      heartbeat: "ðŸ’“",
      heartpulse: "ðŸ’—",
      hearts: "â™¥ï¸",
      heavy_check_mark: "âœ”ï¸",
      heavy_division_sign: "âž—",
      heavy_dollar_sign: "ðŸ’²",
      heavy_heart_exclamation: "â£ï¸",
      heavy_minus_sign: "âž–",
      heavy_multiplication_x: "âœ–ï¸",
      heavy_plus_sign: "âž•",
      helicopter: "ðŸš",
      herb: "ðŸŒ¿",
      hibiscus: "ðŸŒº",
      high_brightness: "ðŸ”†",
      high_heel: "ðŸ‘ ",
      hocho: "ðŸ”ª",
      hole: "ðŸ•³",
      honey_pot: "ðŸ¯",
      horse: "ðŸ´",
      horse_racing: "ðŸ‡",
      hospital: "ðŸ¥",
      hot_pepper: "ðŸŒ¶",
      hotdog: "ðŸŒ­",
      hotel: "ðŸ¨",
      hotsprings: "â™¨ï¸",
      hourglass: "âŒ›ï¸",
      hourglass_flowing_sand: "â³",
      house: "ðŸ ",
      house_with_garden: "ðŸ¡",
      houses: "ðŸ˜",
      hugs: "ðŸ¤—",
      hushed: "ðŸ˜¯",
      ice_cream: "ðŸ¨",
      ice_hockey: "ðŸ’",
      ice_skate: "â›¸",
      icecream: "ðŸ¦",
      id: "ðŸ†”",
      ideograph_advantage: "ðŸ‰",
      imp: "ðŸ‘¿",
      inbox_tray: "ðŸ“¥",
      incoming_envelope: "ðŸ“¨",
      tipping_hand_woman: "ðŸ’",
      information_source: "â„¹ï¸",
      innocent: "ðŸ˜‡",
      interrobang: "â‰ï¸",
      iphone: "ðŸ“±",
      izakaya_lantern: "ðŸ®",
      jack_o_lantern: "ðŸŽƒ",
      japan: "ðŸ—¾",
      japanese_castle: "ðŸ¯",
      japanese_goblin: "ðŸ‘º",
      japanese_ogre: "ðŸ‘¹",
      jeans: "ðŸ‘–",
      joy: "ðŸ˜‚",
      joy_cat: "ðŸ˜¹",
      joystick: "ðŸ•¹",
      kaaba: "ðŸ•‹",
      key: "ðŸ”‘",
      keyboard: "âŒ¨ï¸",
      keycap_ten: "ðŸ”Ÿ",
      kick_scooter: "ðŸ›´",
      kimono: "ðŸ‘˜",
      kiss: "ðŸ’‹",
      kissing: "ðŸ˜—",
      kissing_cat: "ðŸ˜½",
      kissing_closed_eyes: "ðŸ˜š",
      kissing_heart: "ðŸ˜˜",
      kissing_smiling_eyes: "ðŸ˜™",
      kiwi_fruit: "ðŸ¥",
      koala: "ðŸ¨",
      koko: "ðŸˆ",
      label: "ðŸ·",
      large_blue_circle: "ðŸ”µ",
      large_blue_diamond: "ðŸ”·",
      large_orange_diamond: "ðŸ”¶",
      last_quarter_moon: "ðŸŒ—",
      last_quarter_moon_with_face: "ðŸŒœ",
      latin_cross: "âœï¸",
      laughing: "ðŸ˜†",
      leaves: "ðŸƒ",
      ledger: "ðŸ“’",
      left_luggage: "ðŸ›…",
      left_right_arrow: "â†”ï¸",
      leftwards_arrow_with_hook: "â†©ï¸",
      lemon: "ðŸ‹",
      leo: "â™Œï¸",
      leopard: "ðŸ†",
      level_slider: "ðŸŽš",
      libra: "â™Žï¸",
      light_rail: "ðŸšˆ",
      link: "ðŸ”—",
      lion: "ðŸ¦",
      lips: "ðŸ‘„",
      lipstick: "ðŸ’„",
      lizard: "ðŸ¦Ž",
      lock: "ðŸ”’",
      lock_with_ink_pen: "ðŸ”",
      lollipop: "ðŸ­",
      loop: "âž¿",
      loud_sound: "ðŸ”Š",
      loudspeaker: "ðŸ“¢",
      love_hotel: "ðŸ©",
      love_letter: "ðŸ’Œ",
      low_brightness: "ðŸ”…",
      lying_face: "ðŸ¤¥",
      m: "â“‚ï¸",
      mag: "ðŸ”",
      mag_right: "ðŸ”Ž",
      mahjong: "ðŸ€„ï¸",
      mailbox: "ðŸ“«",
      mailbox_closed: "ðŸ“ª",
      mailbox_with_mail: "ðŸ“¬",
      mailbox_with_no_mail: "ðŸ“­",
      man: "ðŸ‘¨",
      man_artist: "ðŸ‘¨&zwj;ðŸŽ¨",
      man_astronaut: "ðŸ‘¨&zwj;ðŸš€",
      man_cartwheeling: "ðŸ¤¸&zwj;â™‚ï¸",
      man_cook: "ðŸ‘¨&zwj;ðŸ³",
      man_dancing: "ðŸ•º",
      man_facepalming: "ðŸ¤¦&zwj;â™‚ï¸",
      man_factory_worker: "ðŸ‘¨&zwj;ðŸ­",
      man_farmer: "ðŸ‘¨&zwj;ðŸŒ¾",
      man_firefighter: "ðŸ‘¨&zwj;ðŸš’",
      man_health_worker: "ðŸ‘¨&zwj;âš•ï¸",
      man_in_tuxedo: "ðŸ¤µ",
      man_judge: "ðŸ‘¨&zwj;âš–ï¸",
      man_juggling: "ðŸ¤¹&zwj;â™‚ï¸",
      man_mechanic: "ðŸ‘¨&zwj;ðŸ”§",
      man_office_worker: "ðŸ‘¨&zwj;ðŸ’¼",
      man_pilot: "ðŸ‘¨&zwj;âœˆï¸",
      man_playing_handball: "ðŸ¤¾&zwj;â™‚ï¸",
      man_playing_water_polo: "ðŸ¤½&zwj;â™‚ï¸",
      man_scientist: "ðŸ‘¨&zwj;ðŸ”¬",
      man_shrugging: "ðŸ¤·&zwj;â™‚ï¸",
      man_singer: "ðŸ‘¨&zwj;ðŸŽ¤",
      man_student: "ðŸ‘¨&zwj;ðŸŽ“",
      man_teacher: "ðŸ‘¨&zwj;ðŸ«",
      man_technologist: "ðŸ‘¨&zwj;ðŸ’»",
      man_with_gua_pi_mao: "ðŸ‘²",
      man_with_turban: "ðŸ‘³",
      tangerine: "ðŸŠ",
      mans_shoe: "ðŸ‘ž",
      mantelpiece_clock: "ðŸ•°",
      maple_leaf: "ðŸ",
      martial_arts_uniform: "ðŸ¥‹",
      mask: "ðŸ˜·",
      massage_woman: "ðŸ’†",
      massage_man: "ðŸ’†&zwj;â™‚ï¸",
      meat_on_bone: "ðŸ–",
      medal_military: "ðŸŽ–",
      medal_sports: "ðŸ…",
      mega: "ðŸ“£",
      melon: "ðŸˆ",
      memo: "ðŸ“",
      men_wrestling: "ðŸ¤¼&zwj;â™‚ï¸",
      menorah: "ðŸ•Ž",
      mens: "ðŸš¹",
      metal: "ðŸ¤˜",
      metro: "ðŸš‡",
      microphone: "ðŸŽ¤",
      microscope: "ðŸ”¬",
      milk_glass: "ðŸ¥›",
      milky_way: "ðŸŒŒ",
      minibus: "ðŸš",
      minidisc: "ðŸ’½",
      mobile_phone_off: "ðŸ“´",
      money_mouth_face: "ðŸ¤‘",
      money_with_wings: "ðŸ’¸",
      moneybag: "ðŸ’°",
      monkey: "ðŸ’",
      monkey_face: "ðŸµ",
      monorail: "ðŸš",
      moon: "ðŸŒ”",
      mortar_board: "ðŸŽ“",
      mosque: "ðŸ•Œ",
      motor_boat: "ðŸ›¥",
      motor_scooter: "ðŸ›µ",
      motorcycle: "ðŸ",
      motorway: "ðŸ›£",
      mount_fuji: "ðŸ—»",
      mountain: "â›°",
      mountain_biking_man: "ðŸšµ",
      mountain_biking_woman: "ðŸšµ&zwj;â™€ï¸",
      mountain_cableway: "ðŸš ",
      mountain_railway: "ðŸšž",
      mountain_snow: "ðŸ”",
      mouse: "ðŸ­",
      mouse2: "ðŸ",
      movie_camera: "ðŸŽ¥",
      moyai: "ðŸ—¿",
      mrs_claus: "ðŸ¤¶",
      muscle: "ðŸ’ª",
      mushroom: "ðŸ„",
      musical_keyboard: "ðŸŽ¹",
      musical_note: "ðŸŽµ",
      musical_score: "ðŸŽ¼",
      mute: "ðŸ”‡",
      nail_care: "ðŸ’…",
      name_badge: "ðŸ“›",
      national_park: "ðŸž",
      nauseated_face: "ðŸ¤¢",
      necktie: "ð��‘”",
      negative_squared_cross_mark: "��Ž",
      nerd_face: "ðŸ¤“",
      neutral_face: "ðŸ˜",
      new: "ðŸ†•",
      new_moon: "ðŸŒ‘",
      new_moon_with_face: "ðŸŒš",
      newspaper: "ðŸ“°",
      newspaper_roll: "ðŸ—ž",
      next_track_button: "â­",
      ng: "ðŸ†–",
      no_good_man: "ðŸ™…&zwj;â™‚ï¸",
      no_good_woman: "ðŸ™…",
      night_with_stars: "ðŸŒƒ",
      no_bell: "ðŸ”•",
      no_bicycles: "ðŸš³",
      no_entry: "â›”ï¸",
      no_entry_sign: "ð��š«",
      no_mobile_phones: "ðŸ“µ",
      no_mouth: "ðŸ˜¶",
      no_pedestrians: "ðŸš·",
      no_smoking: "ðŸš­",
      "non-potable_water": "ðŸš±",
      nose: "ðŸ‘ƒ",
      notebook: "ð����““",
      notebook_with_decorative_cover: "ðŸ“���",
      notes: "ðŸŽ��",
      nut_and_bolt: "ðŸ”©",
      o: "â­•ï¸",
      o2: "ðŸ…¾ï¸",
      ocean: "ðŸŒŠ",
      octopus: "ðŸ™",
      oden: "ðŸ����",
      office: "ðŸ¢",
      oil_drum: "ðŸ›¢",
      ok: "ðŸ���—",
      ok_hand: "ðŸ‘Œ",
      ok_man: "ðŸ™†&zwj;â™‚ï¸",
      ok_woman: "ðŸ™†",
      old_key: "ð��—",
      older_man: "ðŸ‘´",
      older_woman: "ðŸ‘µ",
      om: "ðŸ•‰",
      on: "ðŸ”›",
      oncoming_automobile: "ðŸš˜",
      oncoming_bus: "ðŸš",
      oncoming_police_car: "ðŸš”",
      oncoming_taxi: "ðŸš–",
      open_file_folder: "ðŸ“‚",
      open_hands: "ðŸ‘",
      open_mouth: "ðŸ˜®",
      open_umbrella: "â˜‚ï¸",
      ophiuchus: "â›Ž",
      orange_book: "ðŸ“™",
      orthodox_cross: "â˜¦ï¸",
      outbox_tray: "ðŸ“¤",
      owl: "ðŸ¦‰",
      ox: "ðŸ‚",
      package: "ðŸ“¦",
      page_facing_up: "ðŸ“„",
      page_with_curl: "ðŸ“ƒ",
      pager: "ðŸ“Ÿ",
      paintbrush: "ðŸ–Œ",
      palm_tree: "ðŸŒ´",
      pancakes: "ðŸ¥ž",
      panda_face: "ðŸ¼",
      paperclip: "ðŸ“Ž",
      paperclips: "ðŸ–‡",
      parasol_on_ground: "â›±",
      parking: "ðŸ…¿ï¸",
      part_alternation_mark: "ã€½ï¸",
      partly_sunny: "â›…ï¸",
      passenger_ship: "ðŸ›³",
      passport_control: "ðŸ›‚",
      pause_button: "â¸",
      peace_symbol: "â˜®ï¸",
      peach: "ðŸ‘",
      peanuts: "ðŸ¥œ",
      pear: "ðŸ",
      pen: "ðŸ–Š",
      pencil2: "âœï¸",
      penguin: "ðŸ§",
      pensive: "ðŸ˜”",
      performing_arts: "ðŸŽ­",
      persevere: "ðŸ˜£",
      person_fencing: "ðŸ¤º",
      pouting_woman: "ðŸ™Ž",
      phone: "â˜Žï¸",
      pick: "â›",
      pig: "ðŸ·",
      pig2: "ðŸ–",
      pig_nose: "ðŸ½",
      pill: "ðŸ’Š",
      pineapple: "ðŸ",
      ping_pong: "ðŸ“",
      pisces: "â™“ï¸",
      pizza: "ðŸ•",
      place_of_worship: "ðŸ›",
      plate_with_cutlery: "ðŸ½",
      play_or_pause_button: "â¯",
      point_down: "ðŸ‘‡",
      point_left: "ðŸ‘ˆ",
      point_right: "ðŸ‘‰",
      point_up: "â˜ï¸",
      point_up_2: "ðŸ‘†",
      police_car: "ðŸš“",
      policewoman: "ðŸ‘®&zwj;â™€ï¸",
      poodle: "ðŸ©",
      popcorn: "ðŸ¿",
      post_office: "ðŸ£",
      postal_horn: "ðŸ“¯",
      postbox: "ðŸ“®",
      potable_water: "ðŸš°",
      potato: "ðŸ¥”",
      pouch: "ðŸ‘",
      poultry_leg: "ðŸ—",
      pound: "ðŸ’·",
      rage: "ðŸ˜¡",
      pouting_cat: "ðŸ˜¾",
      pouting_man: "ðŸ™Ž&zwj;â™‚ï¸",
      pray: "ðŸ™",
      prayer_beads: "ðŸ“¿",
      pregnant_woman: "ðŸ¤°",
      previous_track_button: "â®",
      prince: "ðŸ¤��",
      princess: "ðŸ‘¸",
      printer: "ðŸ–¨",
      purple_heart: "ðŸ’œ",
      purse: "ðŸ‘›",
      pushpin: "ðŸ“Œ",
      put_litter_in_its_place: "ðŸš®",
      question: "â“",
      rabbit: "ðŸ°",
      rabbit2: "ðŸ‡",
      racehorse: "ðŸŽ",
      racing_car: "ðŸŽ",
      radio: "ðŸ“��",
      radio_button: "ðŸ”˜",
      radioactive: "â˜¢ï¸��",
      railway_car: "ðŸšƒ",
      railway_track: "ð��›¤",
      rainbow: "ðŸŒˆ",
      rainbow_flag: "ðŸ³ï¸&zwj;ðŸŒˆ",
      raised_back_of_hand: "ðŸ¤š",
      raised_hand_with_fingers_splayed: "ðŸ–",
      raised_hands: "ðŸ™Œ",
      raising_hand_woman: "ðŸ™‹",
      raising_hand_man: "ðŸ™‹&zwj;â™‚ï¸",
      ram: "ðŸ",
      ramen: "ðŸœ",
      rat: "ðŸ€",
      record_button: "âº",
      recycle: "â™»ï¸",
      red_circle: "ðŸ”´",
      registered: "Â®ï¸",
      relaxed: "â˜ºï¸",
      relieved: "ðŸ˜Œ",
      reminder_ribbon: "ðŸŽ—",
      repeat: "ðŸ”",
      repeat_one: "ðŸ”‚",
      rescue_worker_helmet: "â›‘",
      restroom: "��Ÿš»",
      revolving_hearts: "ðŸ�����",
      rewind: "âª",
      rhinoceros: "ðŸ¦",
      ribbon: "ðŸŽ€",
      rice: "ðŸš",
      rice_ball: "ðŸ™",
      rice_cracker: "ðŸ˜",
      rice_scene: "ðŸŽ‘",
      right_anger_bubble: "ðŸ—��",
      ring: "ðŸ’����",
      robot: "ðŸ¤–",
      rocket: "ðŸš€",
      rofl: "ðŸ¤£",
      roll_eyes: "ðŸ™„",
      roller_coaster: "ðŸŽ¢",
      rooster: "ðŸ“",
      rose: "ðŸŒ¹",
      rosette: "ðŸµ",
      rotating_light: "ðŸš¨",
      round_pushpin: "ðŸ“",
      rowing_man: "ðŸš£",
      rowing_woman: "ðŸš£&zwj;â™€ï¸",
      rugby_football: "ðŸ‰",
      running_man: "ðŸƒ",
      running_shirt_with_sash: "ðŸŽ½",
      running_woman: "ðŸƒ&zwj;â™€ï¸",
      sa: "ðŸˆ‚ï¸",
      sagittarius: "â™ï¸",
      sake: "ðŸ¶",
      sandal: "ðŸ‘¡",
      santa: "ðŸŽ…",
      satellite: "ðŸ“¡",
      saxophone: "ðŸŽ·",
      school: "ðŸ«",
      school_satchel: "ðŸŽ’",
      scissors: "âœ‚ï¸",
      scorpion: "ðŸ¦‚",
      scorpius: "â™ï¸",
      scream: "ðŸ˜±",
      scream_cat: "ðŸ™€",
      scroll: "ðŸ“œ",
      seat: "ðŸ’º",
      secret: "ãŠ™ï¸",
      see_no_evil: "ðŸ™ˆ",
      seedling: "ðŸŒ±",
      selfie: "ðŸ¤³",
      shallow_pan_of_food: "ðŸ¥˜",
      shamrock: "â˜˜ï¸",
      shark: "ðŸ¦ˆ",
      shaved_ice: "ðŸ§",
      sheep: "ðŸ‘",
      shell: "ðŸš",
      shield: "ðŸ›¡",
      shinto_shrine: "â›©",
      ship: "ðŸš¢",
      shirt: "ðŸ‘•",
      shopping: "ðŸ›",
      shopping_cart: "ðŸ›’",
      shower: "ðŸš¿",
      shrimp: "ðŸ¦",
      signal_strength: "ðŸ“¶",
      six_pointed_star: "ðŸ”¯",
      ski: "ðŸŽ¿",
      skier: "â›·",
      skull: "ðŸ’€",
      skull_and_crossbones: "â˜ ï¸",
      sleeping: "ðŸ˜´",
      sleeping_bed: "ðŸ›Œ",
      sleepy: "ðŸ˜ª",
      slightly_frowning_face: "ðŸ™",
      slightly_smiling_face: "ðŸ™‚",
      slot_machine: "ðŸŽ°",
      small_airplane: "ðŸ›©",
      small_blue_diamond: "ðŸ”¹",
      small_orange_diamond: "ðŸ”¸",
      small_red_triangle: "ðŸ”º",
      small_red_triangle_down: "ðŸ”»",
      smile: "ðŸ˜„",
      smile_cat: "ðŸ˜¸",
      smiley: "ðŸ˜ƒ",
      smiley_cat: "ðŸ˜º",
      smiling_imp: "ðŸ˜ˆ",
      smirk: "ðŸ˜",
      smirk_cat: "ðŸ˜¼",
      smoking: "ðŸš¬",
      snail: "ðŸŒ",
      snake: "ðŸ",
      sneezing_face: "ðŸ¤§",
      snowboarder: "ðŸ‚",
      snowflake: "â„ï¸",
      snowman: "â›„ï¸",
      snowman_with_snow: "â˜ƒï¸",
      sob: "ðŸ˜­",
      soccer: "âš½ï¸",
      soon: "ðŸ”œ",
      sos: "ðŸ†˜",
      sound: "ðŸ”‰",
      space_invader: "ðŸ‘¾",
      spades: "â™ ï¸",
      spaghetti: "ðŸ",
      sparkle: "â‡ï¸",
      sparkler: "ðŸŽ‡",
      sparkles: "âœ¨",
      sparkling_heart: "ðŸ’–",
      speak_no_evil: "ðŸ™Š",
      speaker: "ðŸ”ˆ",
      speaking_head: "ðŸ—£",
      speech_balloon: "ðŸ’¬",
      speedboat: "ðŸš¤",
      spider: "ðŸ•·",
      spider_web: "ðŸ•¸",
      spiral_calendar: "ðŸ—“",
      spiral_notepad: "ðŸ—’",
      spoon: "ðŸ¥„",
      squid: "ðŸ¦‘",
      stadium: "ðŸŸ",
      star: "â­ï¸",
      star2: "ðŸŒŸ",
      star_and_crescent: "â˜ªï¸",
      star_of_david: "âœ¡ï¸",
      stars: "ðŸŒ ",
      station: "ðŸš‰",
      statue_of_liberty: "ðŸ—½",
      steam_locomotive: "ðŸš‚",
      stew: "ðŸ²",
      stop_button: "â¹",
      stop_sign: "ðŸ›‘",
      stopwatch: "â±",
      straight_ruler: "ðŸ“",
      strawberry: "ðŸ“",
      stuck_out_tongue: "ðŸ˜›",
      stuck_out_tongue_closed_eyes: "ðŸ˜",
      stuck_out_tongue_winking_eye: "ðŸ˜œ",
      studio_microphone: "ðŸŽ™",
      stuffed_flatbread: "ðŸ¥™",
      sun_behind_large_cloud: "ðŸŒ¥",
      sun_behind_rain_cloud: "ðŸŒ¦",
      sun_behind_small_cloud: "ðŸŒ¤",
      sun_with_face: "ðŸŒž",
      sunflower: "ðŸŒ»",
      sunglasses: "ðŸ˜Ž",
      sunny: "â˜€ï¸",
      sunrise: "ðŸŒ…",
      sunrise_over_mountains: "ðŸŒ„",
      surfing_man: "ðŸ„",
      surfing_woman: "ðŸ„&zwj;â™€ï¸",
      sushi: "ðŸ£",
      suspension_railway: "ðŸšŸ",
      sweat: "ðŸ˜“",
      sweat_drops: "ðŸ’¦",
      sweat_smile: "ðŸ˜…",
      sweet_potato: "ðŸ ",
      swimming_man: "ðŸŠ",
      swimming_woman: "ðŸŠ&zwj;â™€ï¸",
      symbols: "ðŸ”£",
      synagogue: "ðŸ•",
      syringe: "ðŸ’‰",
      taco: "ðŸŒ®",
      tada: "ðŸŽ‰",
      tanabata_tree: "ðŸŽ‹",
      taurus: "â™‰ï¸",
      taxi: "ðŸš•",
      tea: "ðŸµ",
      telephone_receiver: "ðŸ“ž",
      telescope: "ðŸ”­",
      tennis: "ðŸŽ¾",
      tent: "â›ºï¸",
      thermometer: "ðŸŒ¡",
      thinking: "ðŸ¤”",
      thought_balloon: "ðŸ’­",
      ticket: "ðŸŽ«",
      tickets: "ðŸŽŸ",
      tiger: "ðŸ¯",
      tiger2: "ðŸ…",
      timer_clock: "â²",
      tipping_hand_man: "ðŸ’&zwj;â™‚ï¸",
      tired_face: "ðŸ˜«",
      tm: "â„¢ï¸",
      toilet: "ðŸš½",
      tokyo_tower: "ðŸ—¼",
      tomato: "ðŸ…",
      tongue: "ðŸ‘…",
      top: "ðŸ”",
      tophat: "ðŸŽ©",
      tornado: "ðŸŒª",
      trackball: "ðŸ–²",
      tractor: "ðŸšœ",
      traffic_light: "ðŸš¥",
      train: "ðŸš‹",
      train2: "ðŸš†",
      tram: "ðŸšŠ",
      triangular_flag_on_post: "ðŸš©",
      triangular_ruler: "ðŸ“",
      trident: "ðŸ”±",
      triumph: "ðŸ˜¤",
      trolleybus: "ðŸšŽ",
      trophy: "ðŸ†",
      tropical_drink: "ðŸ¹",
      tropical_fish: "ðŸ ",
      truck: "ðŸšš",
      trumpet: "ðŸŽº",
      tulip: "ðŸŒ·",
      tumbler_glass: "ðŸ¥ƒ",
      turkey: "ðŸ¦ƒ",
      turtle: "ðŸ¢",
      tv: "ðŸ“º",
      twisted_rightwards_arrows: "ðŸ”€",
      two_hearts: "ðŸ’•",
      two_men_holding_hands: "ðŸ‘¬",
      two_women_holding_hands: "ðŸ‘­",
      u5272: "ðŸˆ¹",
      u5408: "ðŸˆ´",
      u55b6: "ðŸˆº",
      u6307: "ðŸˆ¯ï¸",
      u6708: "ðŸˆ·ï¸",
      u6709: "ðŸˆ¶",
      u6e80: "ðŸˆµ",
      u7121: "ðŸˆšï¸",
      u7533: "ðŸˆ¸",
      u7981: "ðŸˆ²",
      u7a7a: "ðŸˆ³",
      umbrella: "â˜”ï¸",
      unamused: "ðŸ˜’",
      underage: "ðŸ”ž",
      unicorn: "ðŸ¦„",
      unlock: "ðŸ”“",
      up: "ðŸ†™",
      upside_down_face: "ðŸ™ƒ",
      v: "âœŒï¸",
      vertical_traffic_light: "ðŸš¦",
      vhs: "ðŸ“¼",
      vibration_mode: "ðŸ“³",
      video_camera: "ðŸ“¹",
      video_game: "ðŸŽ®",
      violin: "ðŸŽ»",
      virgo: "â™ï¸",
      volcano: "ðŸŒ‹",
      volleyball: "ðŸ",
      vs: "ðŸ†š",
      vulcan_salute: "ðŸ––",
      walking_man: "ðŸš¶",
      walking_woman: "ðŸš¶&zwj;â™€ï¸",
      waning_crescent_moon: "ðŸŒ˜",
      waning_gibbous_moon: "ðŸŒ–",
      warning: "âš ï¸",
      wastebasket: "ðŸ—‘",
      watch: "âŒšï¸",
      water_buffalo: "ðŸƒ",
      watermelon: "ðŸ‰",
      wave: "ðŸ‘‹",
      wavy_dash: "ã€°ï¸",
      waxing_crescent_moon: "ðŸŒ’",
      wc: "ðŸš¾",
      weary: "ðŸ˜©",
      wedding: "ðŸ’’",
      weight_lifting_man: "ðŸ‹ï¸",
      weight_lifting_woman: "ðŸ‹ï¸&zwj;â™€ï¸",
      whale: "ðŸ³",
      whale2: "ðŸ‹",
      wheel_of_dharma: "â˜¸ï¸",
      wheelchair: "â™¿ï¸",
      white_check_mark: "âœ…",
      white_circle: "âšªï¸",
      white_flag: "ðŸ³ï¸",
      white_flower: "ðŸ’®",
      white_large_square: "â¬œï¸",
      white_medium_small_square: "â—½ï¸",
      white_medium_square: "â—»ï¸",
      white_small_square: "â–«ï¸",
      white_square_button: "ðŸ”³",
      wilted_flower: "ðŸ¥€",
      wind_chime: "ðŸŽ",
      wind_face: "ðŸŒ¬",
      wine_glass: "ðŸ·",
      wink: "ðŸ˜‰",
      wolf: "ðŸº",
      woman: "ðŸ‘©",
      woman_artist: "ðŸ‘©&zwj;ðŸŽ¨",
      woman_astronaut: "ðŸ‘©&zwj;ðŸš€",
      woman_cartwheeling: "ðŸ¤¸&zwj;â™€ï¸",
      woman_cook: "ðŸ‘©&zwj;ðŸ³",
      woman_facepalming: "ðŸ¤¦&zwj;â™€ï¸",
      woman_factory_worker: "ðŸ‘©&zwj;ðŸ­",
      woman_farmer: "ðŸ‘©&zwj;ðŸŒ¾",
      woman_firefighter: "ðŸ‘©&zwj;ðŸš’",
      woman_health_worker: "ðŸ‘©&zwj;âš•ï¸",
      woman_judge: "ðŸ‘©&zwj;âš–ï¸",
      woman_juggling: "ðŸ¤¹&zwj;â™€ï¸",
      woman_mechanic: "ðŸ‘©&zwj;ðŸ”§",
      woman_office_worker: "ðŸ‘©&zwj;ðŸ’¼",
      woman_pilot: "ðŸ‘©&zwj;âœˆï¸",
      woman_playing_handball: "ðŸ¤¾&zwj;â™€ï¸",
      woman_playing_water_polo: "ðŸ¤½&zwj;â™€ï¸",
      woman_scientist: "ðŸ‘©&zwj;ðŸ”¬",
      woman_shrugging: "ðŸ¤·&zwj;â™€ï¸",
      woman_singer: "ðŸ‘©&zwj;ðŸŽ¤",
      woman_student: "ðŸ‘©&zwj;ðŸŽ“",
      woman_teacher: "ðŸ‘©&zwj;ðŸ«",
      woman_technologist: "ðŸ‘©&zwj;ðŸ’»",
      woman_with_turban: "ðŸ‘³&zwj;â™€ï¸",
      womans_clothes: "ðŸ‘š",
      womans_hat: "ðŸ‘’",
      women_wrestling: "ðŸ¤¼&zwj;â™€ï¸",
      womens: "ðŸšº",
      world_map: "ðŸ—º",
      worried: "ðŸ˜Ÿ",
      wrench: "ðŸ”§",
      writing_hand: "âœï¸",
      x: "âŒ",
      yellow_heart: "ðŸ’›",
      yen: "ðŸ’´",
      yin_yang: "â˜¯ï¸",
      yum: "ðŸ˜‹",
      zap: "âš¡ï¸",
      zipper_mouth_face: "ðŸ¤",
      zzz: "ðŸ’¤",
      octocat:
        '<img alt=":octocat:" height="20" width="20" align="absmiddle" src="https://assets-cdn.github.com/images/icons/emoji/octocat.png">',
      showdown:
        "<span style=\"font-family: 'Anonymous Pro', monospace; text-decoration: underline; text-decoration-style: dashed; text-decoration-color: #3e8b8a;text-underline-position: under;\">S</span>",
    }),
    (x.Converter = function (e) {
      "use strict";
      var r,
        t,
        n = {},
        i = [],
        l = [],
        o = {},
        a = h,
        s = { parsed: {}, raw: "", format: "" };
      for (r in ((e = e || {}), p)) p.hasOwnProperty(r) && (n[r] = p[r]);
      if ("object" != typeof e)
        throw Error(
          "Converter expects the passed parameter to be an object, but " +
            typeof e +
            " was passed instead."
        );
      for (t in e) e.hasOwnProperty(t) && (n[t] = e[t]);
      function c(e, r) {
        if (((r = r || null), x.helper.isString(e))) {
          if (((r = e = x.helper.stdExtName(e)), x.extensions[e])) {
            console.warn(
              "DEPRECATION WARNING: " +
                e +
                " is an old extension that uses a deprecated loading method.Please inform the developer that the extension should be updated!"
            );
            var t = x.extensions[e],
              a = e;
            if (
              ("function" == typeof t && (t = t(new x.Converter())),
              x.helper.isArray(t) || (t = [t]),
              !(a = g(t, a)).valid)
            )
              throw Error(a.error);
            for (var n = 0; n < t.length; ++n)
              switch (t[n].type) {
                case "lang":
                  i.push(t[n]);
                  break;
                case "output":
                  l.push(t[n]);
                  break;
                default:
                  throw Error("Extension loader error: Type unrecognized!!!");
              }
            return;
          }
          if (x.helper.isUndefined(d[e]))
            throw Error(
              'Extension "' +
                e +
                '" could not be loaded. It was either not found or is not a valid extension.'
            );
          e = d[e];
        }
        "function" == typeof e && (e = e());
        a = g((e = x.helper.isArray(e) ? e : [e]), r);
        if (!a.valid) throw Error(a.error);
        for (var s = 0; s < e.length; ++s) {
          switch (e[s].type) {
            case "lang":
              i.push(e[s]);
              break;
            case "output":
              l.push(e[s]);
          }
          if (e[s].hasOwnProperty("listeners"))
            for (var o in e[s].listeners)
              e[s].listeners.hasOwnProperty(o) && u(o, e[s].listeners[o]);
        }
      }
      function u(e, r) {
        if (!x.helper.isString(e))
          throw Error(
            "Invalid argument in converter.listen() method: name must be a string, but " +
              typeof e +
              " given"
          );
        if ("function" != typeof r)
          throw Error(
            "Invalid argument in converter.listen() method: callback must be a function, but " +
              typeof r +
              " given"
          );
        o.hasOwnProperty(e) || (o[e] = []), o[e].push(r);
      }
      n.extensions && x.helper.forEach(n.extensions, c),
        (this._dispatch = function (e, r, t, a) {
          if (o.hasOwnProperty(e))
            for (var n = 0; n < o[e].length; ++n) {
              var s = o[e][n](e, r, this, t, a);
              s && void 0 !== s && (r = s);
            }
          return r;
        }),
        (this.listen = function (e, r) {
          return u(e, r), this;
        }),
        (this.makeHtml = function (r) {
          if (!r) return r;
          var e,
            t,
            a = {
              gHtmlBlocks: [],
              gHtmlMdBlocks: [],
              gHtmlSpans: [],
              gUrls: {},
              gTitles: {},
              gDimensions: {},
              gListLevel: 0,
              hashLinkCounts: {},
              langExtensions: i,
              outputModifiers: l,
              converter: this,
              ghCodeBlocks: [],
              metadata: { parsed: {}, raw: "", format: "" },
            };
          return (
            (r = (r = (r = (r = (r = r.replace(/Â¨/g, "Â¨T")).replace(
              /\$/g,
              "Â¨D"
            )).replace(/\r\n/g, "\n")).replace(/\r/g, "\n")).replace(
              /\u00A0/g,
              "&nbsp;"
            )),
            n.smartIndentationFix &&
              ((t = (e = r).match(/^\s*/)[0].length),
              (t = new RegExp("^\\s{0," + t + "}", "gm")),
              (r = e.replace(t, ""))),
            (r = "\n\n" + r + "\n\n"),
            (r = (r = x.subParser("detab")(r, n, a)).replace(/^[ \t]+$/gm, "")),
            x.helper.forEach(i, function (e) {
              r = x.subParser("runExtension")(e, r, n, a);
            }),
            (r = x.subParser("metadata")(r, n, a)),
            (r = x.subParser("hashPreCodeTags")(r, n, a)),
            (r = x.subParser("githubCodeBlocks")(r, n, a)),
            (r = x.subParser("hashHTMLBlocks")(r, n, a)),
            (r = x.subParser("hashCodeTags")(r, n, a)),
            (r = x.subParser("stripLinkDefinitions")(r, n, a)),
            (r = x.subParser("blockGamut")(r, n, a)),
            (r = x.subParser("unhashHTMLSpans")(r, n, a)),
            (r = (r = (r = x.subParser("unescapeSpecialChars")(
              r,
              n,
              a
            )).replace(/Â¨D/g, "$$")).replace(/Â¨T/g, "Â¨")),
            (r = x.subParser("completeHTMLDocument")(r, n, a)),
            x.helper.forEach(l, function (e) {
              r = x.subParser("runExtension")(e, r, n, a);
            }),
            (s = a.metadata),
            r
          );
        }),
        (this.makeMarkdown = this.makeMd =
          function (e, r) {
            if (
              ((e = (e = (e = e.replace(/\r\n/g, "\n")).replace(
                /\r/g,
                "\n"
              )).replace(/>[ \t]+</, ">Â¨NBSP;<")),
              !r)
            ) {
              if (!window || !window.document)
                throw new Error(
                  "HTMLParser is undefined. If in a webworker or nodejs environment, you need to provide a WHATWG DOM and HTML such as JSDOM"
                );
              r = window.document;
            }
            for (
              var r = r.createElement("div"),
                t =
                  ((r.innerHTML = e),
                  {
                    preList: (function (e) {
                      for (
                        var r = e.querySelectorAll("pre"), t = [], a = 0;
                        a < r.length;
                        ++a
                      )
                        if (
                          1 === r[a].childElementCount &&
                          "code" === r[a].firstChild.tagName.toLowerCase()
                        ) {
                          var n = r[a].firstChild.innerHTML.trim(),
                            s =
                              r[a].firstChild.getAttribute("data-language") ||
                              "";
                          if ("" === s)
                            for (
                              var o = r[a].firstChild.className.split(" "),
                                i = 0;
                              i < o.length;
                              ++i
                            ) {
                              var l = o[i].match(/^language-(.+)$/);
                              if (null !== l) {
                                s = l[1];
                                break;
                              }
                            }
                          (n = x.helper.unescapeHTMLEntities(n)),
                            t.push(n),
                            (r[a].outerHTML =
                              '<precode language="' +
                              s +
                              '" precodenum="' +
                              a.toString() +
                              '"></precode>');
                        } else
                          t.push(r[a].innerHTML),
                            (r[a].innerHTML = ""),
                            r[a].setAttribute("prenum", a.toString());
                      return t;
                    })(r),
                  }),
                a =
                  (!(function e(r) {
                    for (var t = 0; t < r.childNodes.length; ++t) {
                      var a = r.childNodes[t];
                      3 === a.nodeType
                        ? /\S/.test(a.nodeValue) || /^[ ]+$/.test(a.nodeValue)
                          ? ((a.nodeValue = a.nodeValue.split("\n").join(" ")),
                            (a.nodeValue = a.nodeValue.replace(/(\s)+/g, "$1")))
                          : (r.removeChild(a), --t)
                        : 1 === a.nodeType && e(a);
                    }
                  })(r),
                  r.childNodes),
                n = "",
                s = 0;
              s < a.length;
              s++
            )
              n += x.subParser("makeMarkdown.node")(a[s], t);
            return n;
          }),
        (this.setOption = function (e, r) {
          n[e] = r;
        }),
        (this.getOption = function (e) {
          return n[e];
        }),
        (this.getOptions = function () {
          return n;
        }),
        (this.addExtension = function (e, r) {
          c(e, (r = r || null));
        }),
        (this.useExtension = function (e) {
          c(e);
        }),
        (this.setFlavor = function (e) {
          if (!_.hasOwnProperty(e)) throw Error(e + " flavor was not found");
          var r,
            t = _[e];
          for (r in ((a = e), t)) t.hasOwnProperty(r) && (n[r] = t[r]);
        }),
        (this.getFlavor = function () {
          return a;
        }),
        (this.removeExtension = function (e) {
          x.helper.isArray(e) || (e = [e]);
          for (var r = 0; r < e.length; ++r) {
            for (var t = e[r], a = 0; a < i.length; ++a)
              i[a] === t && i.splice(a, 1);
            for (var n = 0; n < l.length; ++n) l[n] === t && l.splice(n, 1);
          }
        }),
        (this.getAllExtensions = function () {
          return { language: i, output: l };
        }),
        (this.getMetadata = function (e) {
          return e ? s.raw : s.parsed;
        }),
        (this.getMetadataFormat = function () {
          return s.format;
        }),
        (this._setMetadataPair = function (e, r) {
          s.parsed[e] = r;
        }),
        (this._setMetadataFormat = function (e) {
          s.format = e;
        }),
        (this._setMetadataRaw = function (e) {
          s.raw = e;
        });
    }),
    x.subParser("anchors", function (e, i, l) {
      "use strict";
      function r(e, r, t, a, n, s, o) {
        if (
          (x.helper.isUndefined(o) && (o = ""),
          (t = t.toLowerCase()),
          -1 < e.search(/\(<?\s*>? ?(['"].*['"])?\)$/m))
        )
          a = "";
        else if (!a) {
          if (
            ((a = "#" + (t = t || r.toLowerCase().replace(/ ?\n/g, " "))),
            x.helper.isUndefined(l.gUrls[t]))
          )
            return e;
          (a = l.gUrls[t]),
            x.helper.isUndefined(l.gTitles[t]) || (o = l.gTitles[t]);
        }
        return (
          (e =
            '<a href="' +
            (a = a.replace(
              x.helper.regexes.asteriskDashAndColon,
              x.helper.escapeCharactersCallback
            )) +
            '"'),
          "" !== o &&
            null !== o &&
            (e +=
              ' title="' +
              (o = (o = o.replace(/"/g, "&quot;")).replace(
                x.helper.regexes.asteriskDashAndColon,
                x.helper.escapeCharactersCallback
              )) +
              '"'),
          i.openLinksInNewWindow &&
            !/^#/.test(a) &&
            (e += ' rel="noopener noreferrer" target="Â¨E95Eblank"'),
          (e += ">" + r + "</a>")
        );
      }
      return (
        (e = (e = (e = (e = (e = l.converter._dispatch(
          "anchors.before",
          e,
          i,
          l
        )).replace(
          /\[((?:\[[^\]]*]|[^\[\]])*)] ?(?:\n *)?\[(.*?)]()()()()/g,
          r
        )).replace(
          /\[((?:\[[^\]]*]|[^\[\]])*)]()[ \t]*\([ \t]?<([^>]*)>(?:[ \t]*((["'])([^"]*?)\5))?[ \t]?\)/g,
          r
        )).replace(
          /\[((?:\[[^\]]*]|[^\[\]])*)]()[ \t]*\([ \t]?<?([\S]+?(?:\([\S]*?\)[\S]*?)?)>?(?:[ \t]*((["'])([^"]*?)\5))?[ \t]?\)/g,
          r
        )).replace(/\[([^\[\]]+)]()()()()()/g, r)),
        i.ghMentions &&
          (e = e.replace(
            /(^|\s)(\\)?(@([a-z\d]+(?:[a-z\d.-]+?[a-z\d]+)*))/gim,
            function (e, r, t, a, n) {
              if ("\\" === t) return r + a;
              if (!x.helper.isString(i.ghMentionsLink))
                throw new Error("ghMentionsLink option must be a string");
              t = "";
              return (
                r +
                '<a href="' +
                i.ghMentionsLink.replace(/\{u}/g, n) +
                '"' +
                (t = i.openLinksInNewWindow
                  ? ' rel="noopener noreferrer" target="Â¨E95Eblank"'
                  : t) +
                ">" +
                a +
                "</a>"
              );
            }
          )),
        (e = l.converter._dispatch("anchors.after", e, i, l))
      );
    });
  var i =
      /([*~_]+|\b)(((https?|ftp|dict):\/\/|www\.)[^'">\s]+?\.[^'">\s]+?)()(\1)?(?=\s|$)(?!["<>])/gi,
    l =
      /([*~_]+|\b)(((https?|ftp|dict):\/\/|www\.)[^'">\s]+\.[^'">\s]+?)([.!?,()\[\]])?(\1)?(?=\s|$)(?!["<>])/gi,
    c = /()<(((https?|ftp|dict):\/\/|www\.)[^'">\s]+)()>()/gi,
    m =
      /(^|\s)(?:mailto:)?([A-Za-z0-9!#$%&'*+-/=?^_`{|}~.]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)(?=$|\s)/gim,
    f = /<()(?:mailto:)?([-.\w]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi;
  x.subParser("autoLinks", function (e, r, t) {
    "use strict";
    return (
      (e = (e = (e = t.converter._dispatch(
        "autoLinks.before",
        e,
        r,
        t
      )).replace(c, s(r))).replace(f, o(r, t))),
      (e = t.converter._dispatch("autoLinks.after", e, r, t))
    );
  }),
    x.subParser("simplifiedAutoLinks", function (e, r, t) {
      "use strict";
      return r.simplifiedAutoLink
        ? ((e = t.converter._dispatch("simplifiedAutoLinks.before", e, r, t)),
          (e = (e = r.excludeTrailingPunctuationFromURLs
            ? e.replace(l, s(r))
            : e.replace(i, s(r))).replace(m, o(r, t))),
          t.converter._dispatch("simplifiedAutoLinks.after", e, r, t))
        : e;
    }),
    x.subParser("blockGamut", function (e, r, t) {
      "use strict";
      return (
        (e = t.converter._dispatch("blockGamut.before", e, r, t)),
        (e = x.subParser("blockQuotes")(e, r, t)),
        (e = x.subParser("headers")(e, r, t)),
        (e = x.subParser("horizontalRule")(e, r, t)),
        (e = x.subParser("lists")(e, r, t)),
        (e = x.subParser("codeBlocks")(e, r, t)),
        (e = x.subParser("tables")(e, r, t)),
        (e = x.subParser("hashHTMLBlocks")(e, r, t)),
        (e = x.subParser("paragraphs")(e, r, t)),
        (e = t.converter._dispatch("blockGamut.after", e, r, t))
      );
    }),
    x.subParser("blockQuotes", function (e, r, t) {
      "use strict";
      e = t.converter._dispatch("blockQuotes.before", e, r, t);
      var a = /(^ {0,3}>[ \t]?.+\n(.+\n)*\n*)+/gm;
      return (
        r.splitAdjacentBlockquotes && (a = /^ {0,3}>[\s\S]*?(?:\n\n)/gm),
        (e = (e += "\n\n").replace(a, function (e) {
          return (
            (e = (e = (e = e.replace(/^[ \t]*>[ \t]?/gm, "")).replace(
              /Â¨0/g,
              ""
            )).replace(/^[ \t]+$/gm, "")),
            (e = x.subParser("githubCodeBlocks")(e, r, t)),
            (e = (e = (e = x.subParser("blockGamut")(e, r, t)).replace(
              /(^|\n)/g,
              "$1  "
            )).replace(/(\s*<pre>[^\r]+?<\/pre>)/gm, function (e, r) {
              return r.replace(/^  /gm, "Â¨0").replace(/Â¨0/g, "");
            })),
            x.subParser("hashBlock")(
              "<blockquote>\n" + e + "\n</blockquote>",
              r,
              t
            )
          );
        })),
        (e = t.converter._dispatch("blockQuotes.after", e, r, t))
      );
    }),
    x.subParser("codeBlocks", function (e, n, s) {
      "use strict";
      e = s.converter._dispatch("codeBlocks.before", e, n, s);
      return (
        (e = (e = (e += "Â¨0").replace(
          /(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=Â¨0))/g,
          function (e, r, t) {
            var a = "\n",
              r = x.subParser("outdent")(r, n, s);
            return (
              (r = x.subParser("encodeCode")(r, n, s)),
              (r =
                "<pre><code>" +
                (r = (r = (r = x.subParser("detab")(r, n, s)).replace(
                  /^\n+/g,
                  ""
                )).replace(/\n+$/g, "")) +
                (a = n.omitExtraWLInCodeBlocks ? "" : a) +
                "</code></pre>"),
              x.subParser("hashBlock")(r, n, s) + t
            );
          }
        )).replace(/Â¨0/, "")),
        (e = s.converter._dispatch("codeBlocks.after", e, n, s))
      );
    }),
    x.subParser("codeSpans", function (e, n, s) {
      "use strict";
      return (
        (e = (e =
          void 0 === (e = s.converter._dispatch("codeSpans.before", e, n, s))
            ? ""
            : e).replace(
          /(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,
          function (e, r, t, a) {
            return (
              (a = (a = a.replace(/^([ \t]*)/g, "")).replace(/[ \t]*$/g, "")),
              (a =
                r +
                "<code>" +
                (a = x.subParser("encodeCode")(a, n, s)) +
                "</code>"),
              (a = x.subParser("hashHTMLSpans")(a, n, s))
            );
          }
        )),
        (e = s.converter._dispatch("codeSpans.after", e, n, s))
      );
    }),
    x.subParser("completeHTMLDocument", function (e, r, t) {
      "use strict";
      if (!r.completeHTMLDocument) return e;
      e = t.converter._dispatch("completeHTMLDocument.before", e, r, t);
      var a,
        n = "html",
        s = "<!DOCTYPE HTML>\n",
        o = "",
        i = '<meta charset="utf-8">\n',
        l = "",
        c = "";
      for (a in (void 0 !== t.metadata.parsed.doctype &&
        ((s = "<!DOCTYPE " + t.metadata.parsed.doctype + ">\n"),
        ("html" !== (n = t.metadata.parsed.doctype.toString().toLowerCase()) &&
          "html5" !== n) ||
          (i = '<meta charset="utf-8">')),
      t.metadata.parsed))
        if (t.metadata.parsed.hasOwnProperty(a))
          switch (a.toLowerCase()) {
            case "doctype":
              break;
            case "title":
              o = "<title>" + t.metadata.parsed.title + "</title>\n";
              break;
            case "charset":
              i =
                "html" === n || "html5" === n
                  ? '<meta charset="' + t.metadata.parsed.charset + '">\n'
                  : '<meta name="charset" content="' +
                    t.metadata.parsed.charset +
                    '">\n';
              break;
            case "language":
            case "lang":
              (l = ' lang="' + t.metadata.parsed[a] + '"'),
                (c +=
                  '<meta name="' +
                  a +
                  '" content="' +
                  t.metadata.parsed[a] +
                  '">\n');
              break;
            default:
              c +=
                '<meta name="' +
                a +
                '" content="' +
                t.metadata.parsed[a] +
                '">\n';
          }
      return (
        (e =
          s +
          "<html" +
          l +
          ">\n<head>\n" +
          o +
          i +
          c +
          "</head>\n<body>\n" +
          e.trim() +
          "\n</body>\n</html>"),
        (e = t.converter._dispatch("completeHTMLDocument.after", e, r, t))
      );
    }),
    x.subParser("detab", function (e, r, t) {
      "use strict";
      return (
        (e = (e = (e = (e = (e = (e = t.converter._dispatch(
          "detab.before",
          e,
          r,
          t
        )).replace(/\t(?=\t)/g, "    ")).replace(/\t/g, "Â¨AÂ¨B")).replace(
          /Â¨B(.+?)Â¨A/g,
          function (e, r) {
            for (var t = r, a = 4 - (t.length % 4), n = 0; n < a; n++) t += " ";
            return t;
          }
        )).replace(/Â¨A/g, "    ")).replace(/Â¨B/g, "")),
        (e = t.converter._dispatch("detab.after", e, r, t))
      );
    }),
    x.subParser("ellipsis", function (e, r, t) {
      "use strict";
      return r.ellipsis
        ? ((e = (e = t.converter._dispatch("ellipsis.before", e, r, t)).replace(
            /\.\.\./g,
            "â€¦"
          )),
          t.converter._dispatch("ellipsis.after", e, r, t))
        : e;
    }),
    x.subParser("emoji", function (e, r, t) {
      "use strict";
      if (!r.emoji) return e;
      return (
        (e = (e = t.converter._dispatch("emoji.before", e, r, t)).replace(
          /:([\S]+?):/g,
          function (e, r) {
            return x.helper.emojis.hasOwnProperty(r) ? x.helper.emojis[r] : e;
          }
        )),
        (e = t.converter._dispatch("emoji.after", e, r, t))
      );
    }),
    x.subParser("encodeAmpsAndAngles", function (e, r, t) {
      "use strict";
      return (
        (e = (e = (e = (e = (e = t.converter._dispatch(
          "encodeAmpsAndAngles.before",
          e,
          r,
          t
        )).replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, "&amp;")).replace(
          /<(?![a-z\/?$!])/gi,
          "&lt;"
        )).replace(/</g, "&lt;")).replace(/>/g, "&gt;")),
        (e = t.converter._dispatch("encodeAmpsAndAngles.after", e, r, t))
      );
    }),
    x.subParser("encodeBackslashEscapes", function (e, r, t) {
      "use strict";
      return (
        (e = (e = (e = t.converter._dispatch(
          "encodeBackslashEscapes.before",
          e,
          r,
          t
        )).replace(/\\(\\)/g, x.helper.escapeCharactersCallback)).replace(
          /\\([`*_{}\[\]()>#+.!~=|:-])/g,
          x.helper.escapeCharactersCallback
        )),
        (e = t.converter._dispatch("encodeBackslashEscapes.after", e, r, t))
      );
    }),
    x.subParser("encodeCode", function (e, r, t) {
      "use strict";
      return (
        (e = (e = t.converter._dispatch("encodeCode.before", e, r, t))
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/([*_{}\[\]\\=~-])/g, x.helper.escapeCharactersCallback)),
        (e = t.converter._dispatch("encodeCode.after", e, r, t))
      );
    }),
    x.subParser("escapeSpecialCharsWithinTagAttributes", function (e, r, t) {
      "use strict";
      return (
        (e = (e = (e = t.converter._dispatch(
          "escapeSpecialCharsWithinTagAttributes.before",
          e,
          r,
          t
        )).replace(/<\/?[a-z\d_:-]+(?:[\s]+[\s\S]+?)?>/gi, function (e) {
          return e
            .replace(/(.)<\/?code>(?=.)/g, "$1`")
            .replace(/([\\`*_~=|])/g, x.helper.escapeCharactersCallback);
        })).replace(
          /<!(--(?:(?:[^>-]|-[^>])(?:[^-]|-[^-])*)--)>/gi,
          function (e) {
            return e.replace(
              /([\\`*_~=|])/g,
              x.helper.escapeCharactersCallback
            );
          }
        )),
        (e = t.converter._dispatch(
          "escapeSpecialCharsWithinTagAttributes.after",
          e,
          r,
          t
        ))
      );
    }),
    x.subParser("githubCodeBlocks", function (e, s, o) {
      "use strict";
      return s.ghCodeBlocks
        ? ((e = o.converter._dispatch("githubCodeBlocks.before", e, s, o)),
          (e = (e = (e += "Â¨0").replace(
            /(?:^|\n)(?: {0,3})(```+|~~~+)(?: *)([^\s`~]*)\n([\s\S]*?)\n(?: {0,3})\1/g,
            function (e, r, t, a) {
              var n = s.omitExtraWLInCodeBlocks ? "" : "\n";
              return (
                (a = x.subParser("encodeCode")(a, s, o)),
                (a =
                  "<pre><code" +
                  (t ? ' class="' + t + " language-" + t + '"' : "") +
                  ">" +
                  (a = (a = (a = x.subParser("detab")(a, s, o)).replace(
                    /^\n+/g,
                    ""
                  )).replace(/\n+$/g, "")) +
                  n +
                  "</code></pre>"),
                (a = x.subParser("hashBlock")(a, s, o)),
                "\n\nÂ¨G" +
                  (o.ghCodeBlocks.push({ text: e, codeblock: a }) - 1) +
                  "G\n\n"
              );
            }
          )).replace(/Â¨0/, "")),
          o.converter._dispatch("githubCodeBlocks.after", e, s, o))
        : e;
    }),
    x.subParser("hashBlock", function (e, r, t) {
      "use strict";
      return (
        (e = (e = t.converter._dispatch("hashBlock.before", e, r, t)).replace(
          /(^\n+|\n+$)/g,
          ""
        )),
        (e = "\n\nÂ¨K" + (t.gHtmlBlocks.push(e) - 1) + "K\n\n"),
        (e = t.converter._dispatch("hashBlock.after", e, r, t))
      );
    }),
    x.subParser("hashCodeTags", function (e, n, s) {
      "use strict";
      e = s.converter._dispatch("hashCodeTags.before", e, n, s);
      return (
        (e = x.helper.replaceRecursiveRegExp(
          e,
          function (e, r, t, a) {
            t = t + x.subParser("encodeCode")(r, n, s) + a;
            return "Â¨C" + (s.gHtmlSpans.push(t) - 1) + "C";
          },
          "<code\\b[^>]*>",
          "</code>",
          "gim"
        )),
        (e = s.converter._dispatch("hashCodeTags.after", e, n, s))
      );
    }),
    x.subParser("hashElement", function (e, r, t) {
      "use strict";
      return function (e, r) {
        return (
          (r = (r = (r = r.replace(/\n\n/g, "\n")).replace(/^\n/, "")).replace(
            /\n+$/g,
            ""
          )),
          (r = "\n\nÂ¨K" + (t.gHtmlBlocks.push(r) - 1) + "K\n\n")
        );
      };
    }),
    x.subParser("hashHTMLBlocks", function (e, r, n) {
      "use strict";
      e = n.converter._dispatch("hashHTMLBlocks.before", e, r, n);
      function t(e, r, t, a) {
        return (
          -1 !== t.search(/\bmarkdown\b/) &&
            (e = t + n.converter.makeHtml(r) + a),
          "\n\nÂ¨K" + (n.gHtmlBlocks.push(e) - 1) + "K\n\n"
        );
      }
      var a = [
        "pre",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "table",
        "dl",
        "ol",
        "ul",
        "script",
        "noscript",
        "form",
        "fieldset",
        "iframe",
        "math",
        "style",
        "section",
        "header",
        "footer",
        "nav",
        "article",
        "aside",
        "address",
        "audio",
        "canvas",
        "figure",
        "hgroup",
        "output",
        "video",
        "p",
      ];
      r.backslashEscapesHTMLTags &&
        (e = e.replace(/\\<(\/?[^>]+?)>/g, function (e, r) {
          return "&lt;" + r + "&gt;";
        }));
      for (var s = 0; s < a.length; ++s)
        for (
          var o = new RegExp("^ {0,3}(<" + a[s] + "\\b[^>]*>)", "im"),
            i = "<" + a[s] + "\\b[^>]*>",
            l = "</" + a[s] + ">";
          -1 !== (c = x.helper.regexIndexOf(e, o));

        ) {
          var c = x.helper.splitAtIndex(e, c),
            u = x.helper.replaceRecursiveRegExp(c[1], t, i, l, "im");
          if (u === c[1]) break;
          e = c[0].concat(u);
        }
      return (
        (e = e.replace(
          /(\n {0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g,
          x.subParser("hashElement")(e, r, n)
        )),
        (e = (e = x.helper.replaceRecursiveRegExp(
          e,
          function (e) {
            return "\n\nÂ¨K" + (n.gHtmlBlocks.push(e) - 1) + "K\n\n";
          },
          "^ {0,3}\x3c!--",
          "--\x3e",
          "gm"
        )).replace(
          /(?:\n\n)( {0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g,
          x.subParser("hashElement")(e, r, n)
        )),
        (e = n.converter._dispatch("hashHTMLBlocks.after", e, r, n))
      );
    }),
    x.subParser("hashHTMLSpans", function (e, r, t) {
      "use strict";
      function a(e) {
        return "Â¨C" + (t.gHtmlSpans.push(e) - 1) + "C";
      }
      return (
        (e = (e = (e = (e = (e = t.converter._dispatch(
          "hashHTMLSpans.before",
          e,
          r,
          t
        )).replace(/<[^>]+?\/>/gi, a)).replace(
          /<([^>]+?)>[\s\S]*?<\/\1>/g,
          a
        )).replace(/<([^>]+?)\s[^>]+?>[\s\S]*?<\/\1>/g, a)).replace(
          /<[^>]+?>/gi,
          a
        )),
        (e = t.converter._dispatch("hashHTMLSpans.after", e, r, t))
      );
    }),
    x.subParser("unhashHTMLSpans", function (e, r, t) {
      "use strict";
      e = t.converter._dispatch("unhashHTMLSpans.before", e, r, t);
      for (var a = 0; a < t.gHtmlSpans.length; ++a) {
        for (var n = t.gHtmlSpans[a], s = 0; /Â¨C(\d+)C/.test(n); ) {
          var o = RegExp.$1,
            n = n.replace("Â¨C" + o + "C", t.gHtmlSpans[o]);
          if (10 === s) {
            console.error("maximum nesting of 10 spans reached!!!");
            break;
          }
          ++s;
        }
        e = e.replace("Â¨C" + a + "C", n);
      }
      return (e = t.converter._dispatch("unhashHTMLSpans.after", e, r, t));
    }),
    x.subParser("hashPreCodeTags", function (e, n, s) {
      "use strict";
      e = s.converter._dispatch("hashPreCodeTags.before", e, n, s);
      return (
        (e = x.helper.replaceRecursiveRegExp(
          e,
          function (e, r, t, a) {
            t = t + x.subParser("encodeCode")(r, n, s) + a;
            return (
              "\n\nÂ¨G" +
              (s.ghCodeBlocks.push({ text: e, codeblock: t }) - 1) +
              "G\n\n"
            );
          },
          "^ {0,3}<pre\\b[^>]*>\\s*<code\\b[^>]*>",
          "^ {0,3}</code>\\s*</pre>",
          "gim"
        )),
        (e = s.converter._dispatch("hashPreCodeTags.after", e, n, s))
      );
    }),
    x.subParser("headers", function (e, n, s) {
      "use strict";
      e = s.converter._dispatch("headers.before", e, n, s);
      var o = isNaN(parseInt(n.headerLevelStart))
          ? 1
          : parseInt(n.headerLevelStart),
        r = n.smoothLivePreview
          ? /^(.+)[ \t]*\n={2,}[ \t]*\n+/gm
          : /^(.+)[ \t]*\n=+[ \t]*\n+/gm,
        t = n.smoothLivePreview
          ? /^(.+)[ \t]*\n-{2,}[ \t]*\n+/gm
          : /^(.+)[ \t]*\n-+[ \t]*\n+/gm,
        r =
          ((e = (e = e.replace(r, function (e, r) {
            var t = x.subParser("spanGamut")(r, n, s),
              r = n.noHeaderId ? "" : ' id="' + i(r) + '"',
              r = "<h" + o + r + ">" + t + "</h" + o + ">";
            return x.subParser("hashBlock")(r, n, s);
          })).replace(t, function (e, r) {
            var t = x.subParser("spanGamut")(r, n, s),
              r = n.noHeaderId ? "" : ' id="' + i(r) + '"',
              a = o + 1,
              r = "<h" + a + r + ">" + t + "</h" + a + ">";
            return x.subParser("hashBlock")(r, n, s);
          })),
          n.requireSpaceBeforeHeadingText
            ? /^(#{1,6})[ \t]+(.+?)[ \t]*#*\n+/gm
            : /^(#{1,6})[ \t]*(.+?)[ \t]*#*\n+/gm);
      function i(e) {
        var r = (e =
            n.customizedHeaderId && (r = e.match(/\{([^{]+?)}\s*$/)) && r[1]
              ? r[1]
              : e),
          e = x.helper.isString(n.prefixHeaderId)
            ? n.prefixHeaderId
            : !0 === n.prefixHeaderId
            ? "section-"
            : "";
        return (
          n.rawPrefixHeaderId || (r = e + r),
          (r = (
            n.ghCompatibleHeaderId
              ? r
                  .replace(/ /g, "-")
                  .replace(/&amp;/g, "")
                  .replace(/Â¨T/g, "")
                  .replace(/Â¨D/g, "")
                  .replace(/[&+$,\/:;=?@"#{}|^Â¨~\[\]`\\*)(%.!'<>]/g, "")
              : n.rawHeaderId
              ? r
                  .replace(/ /g, "-")
                  .replace(/&amp;/g, "&")
                  .replace(/Â¨T/g, "Â¨")
                  .replace(/Â¨D/g, "$")
                  .replace(/["']/g, "-")
              : r.replace(/[^\w]/g, "")
          ).toLowerCase()),
          n.rawPrefixHeaderId && (r = e + r),
          s.hashLinkCounts[r]
            ? (r = r + "-" + s.hashLinkCounts[r]++)
            : (s.hashLinkCounts[r] = 1),
          r
        );
      }
      return (
        (e = e.replace(r, function (e, r, t) {
          var a = t,
            a =
              (n.customizedHeaderId &&
                (a = t.replace(/\s?\{([^{]+?)}\s*$/, "")),
              x.subParser("spanGamut")(a, n, s)),
            t = n.noHeaderId ? "" : ' id="' + i(t) + '"',
            r = o - 1 + r.length,
            t = "<h" + r + t + ">" + a + "</h" + r + ">";
          return x.subParser("hashBlock")(t, n, s);
        })),
        (e = s.converter._dispatch("headers.after", e, n, s))
      );
    }),
    x.subParser("horizontalRule", function (e, r, t) {
      "use strict";
      e = t.converter._dispatch("horizontalRule.before", e, r, t);
      var a = x.subParser("hashBlock")("<hr />", r, t);
      return (
        (e = (e = (e = e.replace(/^ {0,2}( ?-){3,}[ \t]*$/gm, a)).replace(
          /^ {0,2}( ?\*){3,}[ \t]*$/gm,
          a
        )).replace(/^ {0,2}( ?_){3,}[ \t]*$/gm, a)),
        (e = t.converter._dispatch("horizontalRule.after", e, r, t))
      );
    }),
    x.subParser("images", function (e, r, d) {
      "use strict";
      function l(e, r, t, a, n, s, o, i) {
        var l = d.gUrls,
          c = d.gTitles,
          u = d.gDimensions;
        if (
          ((t = t.toLowerCase()),
          (i = i || ""),
          -1 < e.search(/\(<?\s*>? ?(['"].*['"])?\)$/m))
        )
          a = "";
        else if ("" === a || null === a) {
          if (
            ((a =
              "#" +
              (t =
                "" !== t && null !== t
                  ? t
                  : r.toLowerCase().replace(/ ?\n/g, " "))),
            x.helper.isUndefined(l[t]))
          )
            return e;
          (a = l[t]),
            x.helper.isUndefined(c[t]) || (i = c[t]),
            x.helper.isUndefined(u[t]) || ((n = u[t].width), (s = u[t].height));
        }
        r = r
          .replace(/"/g, "&quot;")
          .replace(
            x.helper.regexes.asteriskDashAndColon,
            x.helper.escapeCharactersCallback
          );
        e =
          '<img src="' +
          (a = a.replace(
            x.helper.regexes.asteriskDashAndColon,
            x.helper.escapeCharactersCallback
          )) +
          '" alt="' +
          r +
          '"';
        return (
          i &&
            x.helper.isString(i) &&
            (e +=
              ' title="' +
              (i = i
                .replace(/"/g, "&quot;")
                .replace(
                  x.helper.regexes.asteriskDashAndColon,
                  x.helper.escapeCharactersCallback
                )) +
              '"'),
          n &&
            s &&
            (e =
              e +
              (' width="' + (n = "*" === n ? "auto" : n)) +
              '" height="' +
              (s = "*" === s ? "auto" : s) +
              '"'),
          (e += " />")
        );
      }
      return (
        (e = (e = (e = (e = (e = (e = d.converter._dispatch(
          "images.before",
          e,
          r,
          d
        )).replace(
          /!\[([^\]]*?)] ?(?:\n *)?\[([\s\S]*?)]()()()()()/g,
          l
        )).replace(
          /!\[([^\]]*?)][ \t]*()\([ \t]?<?(data:.+?\/.+?;base64,[A-Za-z0-9+/=\n]+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(["'])([^"]*?)\6)?[ \t]?\)/g,
          function (e, r, t, a, n, s, o, i) {
            return l(e, r, t, (a = a.replace(/\s/g, "")), n, s, 0, i);
          }
        )).replace(
          /!\[([^\]]*?)][ \t]*()\([ \t]?<([^>]*)>(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(?:(["'])([^"]*?)\6))?[ \t]?\)/g,
          l
        )).replace(
          /!\[([^\]]*?)][ \t]*()\([ \t]?<?([\S]+?(?:\([\S]*?\)[\S]*?)?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(["'])([^"]*?)\6)?[ \t]?\)/g,
          l
        )).replace(/!\[([^\[\]]+)]()()()()()/g, l)),
        (e = d.converter._dispatch("images.after", e, r, d))
      );
    }),
    x.subParser("italicsAndBold", function (e, r, t) {
      "use strict";
      return (
        (e = t.converter._dispatch("italicsAndBold.before", e, r, t)),
        (e = r.literalMidWordUnderscores
          ? (e = (e = e.replace(/\b___(\S[\s\S]*?)___\b/g, function (e, r) {
              return "<strong><em>" + r + "</em></strong>";
            })).replace(/\b__(\S[\s\S]*?)__\b/g, function (e, r) {
              return "<strong>" + r + "</strong>";
            })).replace(/\b_(\S[\s\S]*?)_\b/g, function (e, r) {
              return "<em>" + r + "</em>";
            })
          : (e = (e = e.replace(/___(\S[\s\S]*?)___/g, function (e, r) {
              return /\S$/.test(r) ? "<strong><em>" + r + "</em></strong>" : e;
            })).replace(/__(\S[\s\S]*?)__/g, function (e, r) {
              return /\S$/.test(r) ? "<strong>" + r + "</strong>" : e;
            })).replace(/_([^\s_][\s\S]*?)_/g, function (e, r) {
              return /\S$/.test(r) ? "<em>" + r + "</em>" : e;
            })),
        (e = r.literalMidWordAsterisks
          ? (e = (e = e.replace(
              /([^*]|^)\B\*\*\*(\S[\s\S]*?)\*\*\*\B(?!\*)/g,
              function (e, r, t) {
                return r + "<strong><em>" + t + "</em></strong>";
              }
            )).replace(
              /([^*]|^)\B\*\*(\S[\s\S]*?)\*\*\B(?!\*)/g,
              function (e, r, t) {
                return r + "<strong>" + t + "</strong>";
              }
            )).replace(
              /([^*]|^)\B\*(\S[\s\S]*?)\*\B(?!\*)/g,
              function (e, r, t) {
                return r + "<em>" + t + "</em>";
              }
            )
          : (e = (e = e.replace(/\*\*\*(\S[\s\S]*?)\*\*\*/g, function (e, r) {
              return /\S$/.test(r) ? "<strong><em>" + r + "</em></strong>" : e;
            })).replace(/\*\*(\S[\s\S]*?)\*\*/g, function (e, r) {
              return /\S$/.test(r) ? "<strong>" + r + "</strong>" : e;
            })).replace(/\*([^\s*][\s\S]*?)\*/g, function (e, r) {
              return /\S$/.test(r) ? "<em>" + r + "</em>" : e;
            })),
        (e = t.converter._dispatch("italicsAndBold.after", e, r, t))
      );
    }),
    x.subParser("lists", function (e, d, c) {
      "use strict";
      function p(e, r) {
        c.gListLevel++, (e = e.replace(/\n{2,}$/, "\n"));
        var t =
            /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(Â¨0| {0,3}([*+-]|\d+[.])[ \t]+))/gm,
          l = /\n[ \t]*\n(?!Â¨0)/.test((e += "Â¨0"));
        return (
          d.disableForced4SpacesIndentedSublists &&
            (t =
              /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(Â¨0|\2([*+-]|\d+[.])[ \t]+))/gm),
          (e = (e = e.replace(t, function (e, r, t, a, n, s, o) {
            o = o && "" !== o.trim();
            var n = x.subParser("outdent")(n, d, c),
              i = "";
            return (
              s &&
                d.tasklists &&
                ((i = ' class="task-list-item" style="list-style-type: none;"'),
                (n = n.replace(/^[ \t]*\[(x|X| )?]/m, function () {
                  var e =
                    '<input type="checkbox" disabled style="margin: 0px 0.35em 0.25em -1.6em; vertical-align: middle;"';
                  return o && (e += " checked"), (e += ">");
                }))),
              (n = n.replace(/^([-*+]|\d\.)[ \t]+[\S\n ]*/g, function (e) {
                return "Â¨A" + e;
              })),
              (n =
                "<li" +
                i +
                ">" +
                (n = (n =
                  r || -1 < n.search(/\n{2,}/)
                    ? ((n = x.subParser("githubCodeBlocks")(n, d, c)),
                      x.subParser("blockGamut")(n, d, c))
                    : ((n = (n = x.subParser("lists")(n, d, c)).replace(
                        /\n$/,
                        ""
                      )),
                      (n = (n = x.subParser("hashHTMLBlocks")(n, d, c)).replace(
                        /\n\n+/g,
                        "\n\n"
                      )),
                      (l
                        ? x.subParser("paragraphs")
                        : x.subParser("spanGamut"))(n, d, c))).replace(
                  "Â¨A",
                  ""
                )) +
                "</li>\n")
            );
          })).replace(/Â¨0/g, "")),
          c.gListLevel--,
          (e = r ? e.replace(/\s+$/, "") : e)
        );
      }
      function h(e, r) {
        if ("ol" === r) {
          r = e.match(/^ *(\d+)\./);
          if (r && "1" !== r[1]) return ' start="' + r[1] + '"';
        }
        return "";
      }
      function n(n, s, o) {
        var e,
          i = d.disableForced4SpacesIndentedSublists
            ? /^ ?\d+\.[ \t]/gm
            : /^ {0,3}\d+\.[ \t]/gm,
          l = d.disableForced4SpacesIndentedSublists
            ? /^ ?[*+-][ \t]/gm
            : /^ {0,3}[*+-][ \t]/gm,
          c = "ul" === s ? i : l,
          u = "";
        return (
          -1 !== n.search(c)
            ? (function e(r) {
                var t = r.search(c),
                  a = h(n, s);
                -1 !== t
                  ? ((u +=
                      "\n\n<" +
                      s +
                      a +
                      ">\n" +
                      p(r.slice(0, t), !!o) +
                      "</" +
                      s +
                      ">\n"),
                    (c = "ul" === (s = "ul" === s ? "ol" : "ul") ? i : l),
                    e(r.slice(t)))
                  : (u +=
                      "\n\n<" + s + a + ">\n" + p(r, !!o) + "</" + s + ">\n");
              })(n)
            : ((e = h(n, s)),
              (u = "\n\n<" + s + e + ">\n" + p(n, !!o) + "</" + s + ">\n")),
          u
        );
      }
      return (
        (e = c.converter._dispatch("lists.before", e, d, c)),
        (e += "Â¨0"),
        (e = (e = c.gListLevel
          ? e.replace(
              /^(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(Â¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
              function (e, r, t) {
                return n(r, -1 < t.search(/[*+-]/g) ? "ul" : "ol", !0);
              }
            )
          : e.replace(
              /(\n\n|^\n?)(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(Â¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
              function (e, r, t, a) {
                return n(t, -1 < a.search(/[*+-]/g) ? "ul" : "ol", !1);
              }
            )).replace(/Â¨0/, "")),
        (e = c.converter._dispatch("lists.after", e, d, c))
      );
    }),
    x.subParser("metadata", function (e, r, a) {
      "use strict";
      return r.metadata
        ? ((e = (e = (e = (e = a.converter._dispatch(
            "metadata.before",
            e,
            r,
            a
          )).replace(
            /^\s*Â«Â«Â«+(\S*?)\n([\s\S]+?)\nÂ»Â»Â»+\n/,
            function (e, r, t) {
              return n(t), "Â¨M";
            }
          )).replace(/^\s*---+(\S*?)\n([\s\S]+?)\n---+\n/, function (e, r, t) {
            return r && (a.metadata.format = r), n(t), "Â¨M";
          })).replace(/Â¨M/g, "")),
          a.converter._dispatch("metadata.after", e, r, a))
        : e;
      function n(e) {
        (e = (e = (a.metadata.raw = e)
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")).replace(/\n {4}/g, " ")).replace(
          /^([\S ]+): +([\s\S]+?)$/gm,
          function (e, r, t) {
            return (a.metadata.parsed[r] = t), "";
          }
        );
      }
    }),
    x.subParser("outdent", function (e, r, t) {
      "use strict";
      return (
        (e = (e = (e = t.converter._dispatch(
          "outdent.before",
          e,
          r,
          t
        )).replace(/^(\t|[ ]{1,4})/gm, "Â¨0")).replace(/Â¨0/g, "")),
        (e = t.converter._dispatch("outdent.after", e, r, t))
      );
    }),
    x.subParser("paragraphs", function (e, r, t) {
      "use strict";
      for (
        var a = (e = (e = (e = t.converter._dispatch(
            "paragraphs.before",
            e,
            r,
            t
          )).replace(/^\n+/g, "")).replace(/\n+$/g, "")).split(/\n{2,}/g),
          n = [],
          s = a.length,
          o = 0;
        o < s;
        o++
      ) {
        var i = a[o];
        0 <= i.search(/Â¨(K|G)(\d+)\1/g)
          ? n.push(i)
          : 0 <= i.search(/\S/) &&
            ((i = (i = x.subParser("spanGamut")(i, r, t)).replace(
              /^([ \t]*)/g,
              "<p>"
            )),
            (i += "</p>"),
            n.push(i));
      }
      for (s = n.length, o = 0; o < s; o++) {
        for (var l = "", c = n[o], u = !1; /Â¨(K|G)(\d+)\1/.test(c); ) {
          var d = RegExp.$1,
            p = RegExp.$2;
          (l = (l =
            "K" === d
              ? t.gHtmlBlocks[p]
              : u
              ? x.subParser("encodeCode")(t.ghCodeBlocks[p].text, r, t)
              : t.ghCodeBlocks[p].codeblock).replace(/\$/g, "$$$$")),
            (c = c.replace(/(\n\n)?Â¨(K|G)\d+\2(\n\n)?/, l)),
            /^<pre\b[^>]*>\s*<code\b[^>]*>/.test(c) && (u = !0);
        }
        n[o] = c;
      }
      return (
        (e = (e = (e = n.join("\n")).replace(/^\n+/g, "")).replace(
          /\n+$/g,
          ""
        )),
        t.converter._dispatch("paragraphs.after", e, r, t)
      );
    }),
    x.subParser("runExtension", function (e, r, t, a) {
      "use strict";
      return (
        e.filter
          ? (r = e.filter(r, a.converter, t))
          : e.regex &&
            ((a = e.regex) instanceof RegExp || (a = new RegExp(a, "g")),
            (r = r.replace(a, e.replace))),
        r
      );
    }),
    x.subParser("spanGamut", function (e, r, t) {
      "use strict";
      return (
        (e = t.converter._dispatch("spanGamut.before", e, r, t)),
        (e = x.subParser("codeSpans")(e, r, t)),
        (e = x.subParser("escapeSpecialCharsWithinTagAttributes")(e, r, t)),
        (e = x.subParser("encodeBackslashEscapes")(e, r, t)),
        (e = x.subParser("images")(e, r, t)),
        (e = x.subParser("anchors")(e, r, t)),
        (e = x.subParser("autoLinks")(e, r, t)),
        (e = x.subParser("simplifiedAutoLinks")(e, r, t)),
        (e = x.subParser("emoji")(e, r, t)),
        (e = x.subParser("underline")(e, r, t)),
        (e = x.subParser("italicsAndBold")(e, r, t)),
        (e = x.subParser("strikethrough")(e, r, t)),
        (e = x.subParser("ellipsis")(e, r, t)),
        (e = x.subParser("hashHTMLSpans")(e, r, t)),
        (e = x.subParser("encodeAmpsAndAngles")(e, r, t)),
        r.simpleLineBreaks
          ? /\n\nÂ¨K/.test(e) || (e = e.replace(/\n+/g, "<br />\n"))
          : (e = e.replace(/  +\n/g, "<br />\n")),
        (e = t.converter._dispatch("spanGamut.after", e, r, t))
      );
    }),
    x.subParser("strikethrough", function (e, t, a) {
      "use strict";
      return (
        t.strikethrough &&
          ((e = (e = a.converter._dispatch(
            "strikethrough.before",
            e,
            t,
            a
          )).replace(/(?:~){2}([\s\S]+?)(?:~){2}/g, function (e, r) {
            return (
              (r = r),
              "<del>" +
                (r = t.simplifiedAutoLink
                  ? x.subParser("simplifiedAutoLinks")(r, t, a)
                  : r) +
                "</del>"
            );
          })),
          (e = a.converter._dispatch("strikethrough.after", e, t, a))),
        e
      );
    }),
    x.subParser("stripLinkDefinitions", function (i, l, c) {
      "use strict";
      function e(e, r, t, a, n, s, o) {
        return (
          (r = r.toLowerCase()),
          i.toLowerCase().split(r).length - 1 < 2
            ? e
            : (t.match(/^data:.+?\/.+?;base64,/)
                ? (c.gUrls[r] = t.replace(/\s/g, ""))
                : (c.gUrls[r] = x.subParser("encodeAmpsAndAngles")(t, l, c)),
              s
                ? s + o
                : (o && (c.gTitles[r] = o.replace(/"|'/g, "&quot;")),
                  l.parseImgDimensions &&
                    a &&
                    n &&
                    (c.gDimensions[r] = { width: a, height: n }),
                  ""))
        );
      }
      return (i = (i = (i = (i += "Â¨0").replace(
        /^ {0,3}\[([^\]]+)]:[ \t]*\n?[ \t]*<?(data:.+?\/.+?;base64,[A-Za-z0-9+/=\n]+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n\n|(?=Â¨0)|(?=\n\[))/gm,
        e
      )).replace(
        /^ {0,3}\[([^\]]+)]:[ \t]*\n?[ \t]*<?([^>\s]+)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n+|(?=Â¨0))/gm,
        e
      )).replace(/Â¨0/, ""));
    }),
    x.subParser("tables", function (e, y, P) {
      "use strict";
      if (!y.tables) return e;
      function r(e) {
        for (var r = e.split("\n"), t = 0; t < r.length; ++t)
          /^ {0,3}\|/.test(r[t]) && (r[t] = r[t].replace(/^ {0,3}\|/, "")),
            /\|[ \t]*$/.test(r[t]) && (r[t] = r[t].replace(/\|[ \t]*$/, "")),
            (r[t] = x.subParser("codeSpans")(r[t], y, P));
        var a,
          n,
          s,
          o,
          i,
          l = r[0].split("|").map(function (e) {
            return e.trim();
          }),
          c = r[1].split("|").map(function (e) {
            return e.trim();
          }),
          u = [],
          d = [],
          p = [],
          h = [];
        for (r.shift(), r.shift(), t = 0; t < r.length; ++t)
          "" !== r[t].trim() &&
            u.push(
              r[t].split("|").map(function (e) {
                return e.trim();
              })
            );
        if (l.length < c.length) return e;
        for (t = 0; t < c.length; ++t)
          p.push(
            ((a = c[t]),
            /^:[ \t]*--*$/.test(a)
              ? ' style="text-align:left;"'
              : /^--*[ \t]*:[ \t]*$/.test(a)
              ? ' style="text-align:right;"'
              : /^:[ \t]*--*[ \t]*:$/.test(a)
              ? ' style="text-align:center;"'
              : "")
          );
        for (t = 0; t < l.length; ++t)
          x.helper.isUndefined(p[t]) && (p[t] = ""),
            d.push(
              ((n = l[t]),
              (s = p[t]),
              void 0,
              (o = ""),
              (n = n.trim()),
              "<th" +
                (o =
                  y.tablesHeaderId || y.tableHeaderId
                    ? ' id="' + n.replace(/ /g, "_").toLowerCase() + '"'
                    : o) +
                s +
                ">" +
                (n = x.subParser("spanGamut")(n, y, P)) +
                "</th>\n")
            );
        for (t = 0; t < u.length; ++t) {
          for (var _ = [], g = 0; g < d.length; ++g)
            x.helper.isUndefined(u[t][g]),
              _.push(
                ((i = u[t][g]),
                "<td" +
                  p[g] +
                  ">" +
                  x.subParser("spanGamut")(i, y, P) +
                  "</td>\n")
              );
          h.push(_);
        }
        for (
          var m = d, f = h, b = "<table>\n<thead>\n<tr>\n", w = m.length, k = 0;
          k < w;
          ++k
        )
          b += m[k];
        for (b += "</tr>\n</thead>\n<tbody>\n", k = 0; k < f.length; ++k) {
          b += "<tr>\n";
          for (var v = 0; v < w; ++v) b += f[k][v];
          b += "</tr>\n";
        }
        return (b += "</tbody>\n</table>\n");
      }
      return (
        (e = (e = (e = (e = P.converter._dispatch(
          "tables.before",
          e,
          y,
          P
        )).replace(/\\(\|)/g, x.helper.escapeCharactersCallback)).replace(
          /^ {0,3}\|?.+\|.+\n {0,3}\|?[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*:?[ \t]*(?:[-=]){2,}[\s\S]+?(?:\n\n|Â¨0)/gm,
          r
        )).replace(
          /^ {0,3}\|.+\|[ \t]*\n {0,3}\|[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*\n( {0,3}\|.+\|[ \t]*\n)*(?:\n|Â¨0)/gm,
          r
        )),
        (e = P.converter._dispatch("tables.after", e, y, P))
      );
    }),
    x.subParser("underline", function (e, r, t) {
      "use strict";
      return r.underline
        ? ((e = t.converter._dispatch("underline.before", e, r, t)),
          (e = (e = r.literalMidWordUnderscores
            ? (e = e.replace(/\b___(\S[\s\S]*?)___\b/g, function (e, r) {
                return "<u>" + r + "</u>";
              })).replace(/\b__(\S[\s\S]*?)__\b/g, function (e, r) {
                return "<u>" + r + "</u>";
              })
            : (e = e.replace(/___(\S[\s\S]*?)___/g, function (e, r) {
                return /\S$/.test(r) ? "<u>" + r + "</u>" : e;
              })).replace(/__(\S[\s\S]*?)__/g, function (e, r) {
                return /\S$/.test(r) ? "<u>" + r + "</u>" : e;
              })).replace(/(_)/g, x.helper.escapeCharactersCallback)),
          t.converter._dispatch("underline.after", e, r, t))
        : e;
    }),
    x.subParser("unescapeSpecialChars", function (e, r, t) {
      "use strict";
      return (
        (e = (e = t.converter._dispatch(
          "unescapeSpecialChars.before",
          e,
          r,
          t
        )).replace(/Â¨E(\d+)E/g, function (e, r) {
          r = parseInt(r);
          return String.fromCharCode(r);
        })),
        (e = t.converter._dispatch("unescapeSpecialChars.after", e, r, t))
      );
    }),
    x.subParser("makeMarkdown.blockquote", function (e, r) {
      "use strict";
      var t = "";
      if (e.hasChildNodes())
        for (var a = e.childNodes, n = a.length, s = 0; s < n; ++s) {
          var o = x.subParser("makeMarkdown.node")(a[s], r);
          "" !== o && (t += o);
        }
      return (t = "> " + (t = t.trim()).split("\n").join("\n> "));
    }),
    x.subParser("makeMarkdown.codeBlock", function (e, r) {
      "use strict";
      var t = e.getAttribute("language"),
        e = e.getAttribute("precodenum");
      return "```" + t + "\n" + r.preList[e] + "\n```";
    }),
    x.subParser("makeMarkdown.codeSpan", function (e) {
      "use strict";
      return "`" + e.innerHTML + "`";
    }),
    x.subParser("makeMarkdown.emphasis", function (e, r) {
      "use strict";
      var t = "";
      if (e.hasChildNodes()) {
        t += "*";
        for (var a = e.childNodes, n = a.length, s = 0; s < n; ++s)
          t += x.subParser("makeMarkdown.node")(a[s], r);
        t += "*";
      }
      return t;
    }),
    x.subParser("makeMarkdown.header", function (e, r, t) {
      "use strict";
      var t = new Array(t + 1).join("#"),
        a = "";
      if (e.hasChildNodes())
        for (var a = t + " ", n = e.childNodes, s = n.length, o = 0; o < s; ++o)
          a += x.subParser("makeMarkdown.node")(n[o], r);
      return a;
    }),
    x.subParser("makeMarkdown.hr", function () {
      "use strict";
      return "---";
    }),
    x.subParser("makeMarkdown.image", function (e) {
      "use strict";
      var r = "";
      return (
        e.hasAttribute("src") &&
          ((r =
            (r += "![" + e.getAttribute("alt") + "](") +
            "<" +
            e.getAttribute("src") +
            ">"),
          e.hasAttribute("width") &&
            e.hasAttribute("height") &&
            (r +=
              " =" + e.getAttribute("width") + "x" + e.getAttribute("height")),
          e.hasAttribute("title") &&
            (r += ' "' + e.getAttribute("title") + '"'),
          (r += ")")),
        r
      );
    }),
    x.subParser("makeMarkdown.links", function (e, r) {
      "use strict";
      var t = "";
      if (e.hasChildNodes() && e.hasAttribute("href")) {
        for (var a = e.childNodes, n = a.length, t = "[", s = 0; s < n; ++s)
          t += x.subParser("makeMarkdown.node")(a[s], r);
        (t = (t += "](") + ("<" + e.getAttribute("href") + ">")),
          e.hasAttribute("title") &&
            (t += ' "' + e.getAttribute("title") + '"'),
          (t += ")");
      }
      return t;
    }),
    x.subParser("makeMarkdown.list", function (e, r, t) {
      "use strict";
      var a = "";
      if (!e.hasChildNodes()) return "";
      for (
        var n = e.childNodes,
          s = n.length,
          o = e.getAttribute("start") || 1,
          i = 0;
        i < s;
        ++i
      )
        void 0 !== n[i].tagName &&
          "li" === n[i].tagName.toLowerCase() &&
          ((a +=
            ("ol" === t ? o.toString() + ". " : "- ") +
            x.subParser("makeMarkdown.listItem")(n[i], r)),
          ++o);
      return (a += "\n\x3c!-- --\x3e\n").trim();
    }),
    x.subParser("makeMarkdown.listItem", function (e, r) {
      "use strict";
      for (var t = "", a = e.childNodes, n = a.length, s = 0; s < n; ++s)
        t += x.subParser("makeMarkdown.node")(a[s], r);
      return (
        /\n$/.test(t)
          ? (t = t
              .split("\n")
              .join("\n    ")
              .replace(/^ {4}$/gm, "")
              .replace(/\n\n+/g, "\n\n"))
          : (t += "\n"),
        t
      );
    }),
    x.subParser("makeMarkdown.node", function (e, r, t) {
      "use strict";
      t = t || !1;
      var a = "";
      if (3 === e.nodeType) return x.subParser("makeMarkdown.txt")(e, r);
      if (8 === e.nodeType) return "\x3c!--" + e.data + "--\x3e\n\n";
      if (1 !== e.nodeType) return "";
      switch (e.tagName.toLowerCase()) {
        case "h1":
          t || (a = x.subParser("makeMarkdown.header")(e, r, 1) + "\n\n");
          break;
        case "h2":
          t || (a = x.subParser("makeMarkdown.header")(e, r, 2) + "\n\n");
          break;
        case "h3":
          t || (a = x.subParser("makeMarkdown.header")(e, r, 3) + "\n\n");
          break;
        case "h4":
          t || (a = x.subParser("makeMarkdown.header")(e, r, 4) + "\n\n");
          break;
        case "h5":
          t || (a = x.subParser("makeMarkdown.header")(e, r, 5) + "\n\n");
          break;
        case "h6":
          t || (a = x.subParser("makeMarkdown.header")(e, r, 6) + "\n\n");
          break;
        case "p":
          t || (a = x.subParser("makeMarkdown.paragraph")(e, r) + "\n\n");
          break;
        case "blockquote":
          t || (a = x.subParser("makeMarkdown.blockquote")(e, r) + "\n\n");
          break;
        case "hr":
          t || (a = x.subParser("makeMarkdown.hr")(e, r) + "\n\n");
          break;
        case "ol":
          t || (a = x.subParser("makeMarkdown.list")(e, r, "ol") + "\n\n");
          break;
        case "ul":
          t || (a = x.subParser("makeMarkdown.list")(e, r, "ul") + "\n\n");
          break;
        case "precode":
          t || (a = x.subParser("makeMarkdown.codeBlock")(e, r) + "\n\n");
          break;
        case "pre":
          t || (a = x.subParser("makeMarkdown.pre")(e, r) + "\n\n");
          break;
        case "table":
          t || (a = x.subParser("makeMarkdown.table")(e, r) + "\n\n");
          break;
        case "code":
          a = x.subParser("makeMarkdown.codeSpan")(e, r);
          break;
        case "em":
        case "i":
          a = x.subParser("makeMarkdown.emphasis")(e, r);
          break;
        case "strong":
        case "b":
          a = x.subParser("makeMarkdown.strong")(e, r);
          break;
        case "del":
          a = x.subParser("makeMarkdown.strikethrough")(e, r);
          break;
        case "a":
          a = x.subParser("makeMarkdown.links")(e, r);
          break;
        case "img":
          a = x.subParser("makeMarkdown.image")(e, r);
          break;
        default:
          a = e.outerHTML + "\n\n";
      }
      return a;
    }),
    x.subParser("makeMarkdown.paragraph", function (e, r) {
      "use strict";
      var t = "";
      if (e.hasChildNodes())
        for (var a = e.childNodes, n = a.length, s = 0; s < n; ++s)
          t += x.subParser("makeMarkdown.node")(a[s], r);
      return (t = t.trim());
    }),
    x.subParser("makeMarkdown.pre", function (e, r) {
      "use strict";
      e = e.getAttribute("prenum");
      return "<pre>" + r.preList[e] + "</pre>";
    }),
    x.subParser("makeMarkdown.strikethrough", function (e, r) {
      "use strict";
      var t = "";
      if (e.hasChildNodes()) {
        t += "~~";
        for (var a = e.childNodes, n = a.length, s = 0; s < n; ++s)
          t += x.subParser("makeMarkdown.node")(a[s], r);
        t += "~~";
      }
      return t;
    }),
    x.subParser("makeMarkdown.strong", function (e, r) {
      "use strict";
      var t = "";
      if (e.hasChildNodes()) {
        t += "**";
        for (var a = e.childNodes, n = a.length, s = 0; s < n; ++s)
          t += x.subParser("makeMarkdown.node")(a[s], r);
        t += "**";
      }
      return t;
    }),
    x.subParser("makeMarkdown.table", function (e, r) {
      "use strict";
      for (
        var t = "",
          a = [[], []],
          n = e.querySelectorAll("thead>tr>th"),
          s = e.querySelectorAll("tbody>tr"),
          o = 0;
        o < n.length;
        ++o
      ) {
        var i = x.subParser("makeMarkdown.tableCell")(n[o], r),
          l = "---";
        if (n[o].hasAttribute("style"))
          switch (n[o].getAttribute("style").toLowerCase().replace(/\s/g, "")) {
            case "text-align:left;":
              l = ":---";
              break;
            case "text-align:right;":
              l = "---:";
              break;
            case "text-align:center;":
              l = ":---:";
          }
        (a[0][o] = i.trim()), (a[1][o] = l);
      }
      for (o = 0; o < s.length; ++o)
        for (
          var c = a.push([]) - 1, u = s[o].getElementsByTagName("td"), d = 0;
          d < n.length;
          ++d
        ) {
          var p = " ";
          void 0 !== u[d] &&
            (p = x.subParser("makeMarkdown.tableCell")(u[d], r)),
            a[c].push(p);
        }
      var h = 3;
      for (o = 0; o < a.length; ++o)
        for (d = 0; d < a[o].length; ++d) {
          var _ = a[o][d].length;
          h < _ && (h = _);
        }
      for (o = 0; o < a.length; ++o) {
        for (d = 0; d < a[o].length; ++d)
          1 === o
            ? ":" === a[o][d].slice(-1)
              ? (a[o][d] = x.helper.padEnd(a[o][d].slice(-1), h - 1, "-") + ":")
              : (a[o][d] = x.helper.padEnd(a[o][d], h, "-"))
            : (a[o][d] = x.helper.padEnd(a[o][d], h));
        t += "| " + a[o].join(" | ") + " |\n";
      }
      return t.trim();
    }),
    x.subParser("makeMarkdown.tableCell", function (e, r) {
      "use strict";
      var t = "";
      if (!e.hasChildNodes()) return "";
      for (var a = e.childNodes, n = a.length, s = 0; s < n; ++s)
        t += x.subParser("makeMarkdown.node")(a[s], r, !0);
      return t.trim();
    }),
    x.subParser("makeMarkdown.txt", function (e) {
      "use strict";
      e = e.nodeValue;
      return (
        (e = (e = e.replace(/ +/g, " ")).replace(/Â¨NBSP;/g, " ")),
        (e = (e = (e = (e = (e = (e = (e = (e = (e =
          x.helper.unescapeHTMLEntities(e)).replace(
          /([*_~|`])/g,
          "\\$1"
        )).replace(/^(\s*)>/g, "\\$1>")).replace(/^#/gm, "\\#")).replace(
          /^(\s*)([-=]{3,})(\s*)$/,
          "$1\\$2$3"
        )).replace(/^( {0,3}\d+)\./gm, "$1\\.")).replace(
          /^( {0,3})([+-])/gm,
          "$1\\$2"
        )).replace(/]([\s]*)\(/g, "\\]$1\\(")).replace(
          /^ {0,3}\[([\S \t]*?)]:/gm,
          "\\[$1]:"
        ))
      );
    });
  "function" == typeof define && define.amd
    ? define(function () {
        "use strict";
        return x;
      })
    : "undefined" != typeof module && module.exports
    ? (module.exports = x)
    : (this.showdown = x);
}.call(this);
//# sourceMappingURL=showdown.min.js.map
