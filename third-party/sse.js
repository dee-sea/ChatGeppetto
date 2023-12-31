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
      }.bind(this),
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
      }.bind(this),
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
   * @type Abort
   * Aborts the stream
   * @return {void}
   */
  this.abort = function () {
    console.log("SSE Aborted");
    if (this.readyState === this.CLOSED) {
      return;
    }

    if (this.xhr) {
      this.xhr.abort();
    }

    this.xhr = null;
    this.chunk = "";
    this.progress = 0;
    this._setReadyState(this.CLOSED);
    this.dispatchEvent(new CustomEvent("abort"));
  };

  // /**
  //  * @type Abort
  //  * Aborts the stream
  //  * @return {void}
  //  */
  //
  // this.abort = function () {
  //   console.log("SSE Aborted");
  //   if (this.readyState === this.CLOSED) {
  //     return;
  //   }
  //
  //   if (this.xhr) {
  //     this.xhr.abort();
  //   }
  //
  //   this.xhr = null;
  //   this.chunk = "";
  //   this.progress = 0;
  //   this._setReadyState(this.CLOSED);
  //   this.dispatchEvent(new CustomEvent("abort"));
  // };

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
      this._checkStreamClosed.bind(this),
    );
    this.xhr.addEventListener("error", this._onStreamFailure.bind(this));
    this.xhr.addEventListener("abort", this._onStreamAbort.bind(this));

    // // Handle errors, including AbortError
    // this.xhr.addEventListener(
    //   "error",
    //   function (e) {
    //     if (e.name === "AbortError") {
    //       // Handle the aborted state
    //       console.log("SSE Aborted");
    //       this.dispatchEvent(new CustomEvent("abort"));
    //     } else {
    //       // Handle other error states
    //       console.error("SSE Error:", e);
    //       this._onStreamFailure(e);
    //     }
    //   }.bind(this),
    // );

    signal.addEventListener("abort", this.abort.bind(this));

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
