//
// Event listener function for Tab key
//
function handleTabKey(event, chatInput, suggestionBox, inputHistory) {
  //function handleTabKey(event) {
  if (event.key === "Tab") {
    event.preventDefault();

    const inputValue = chatInput.value.trim();
    const suggestions = getFilteredSuggestions(inputValue, inputHistory);

    if (suggestions.length > 0) {
      chatInput.value = suggestions[0];
      suggestionBox.style.display = "none";

      setTimeout(() => {
        chatInput.focus();
      }, 10);
    }
  }
}

//
// Event listener function for Arrow Up and Arrow Down keys
//
function handleArrowKeys(
  event,
  chatInput,
  suggestionBox,
  ihIndex,
  ihLength,
  inputHistory
) {
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();

    const inputValue = chatInput.value.trim();

    if (inputValue !== "") {
      const suggestionItems =
        suggestionBox.getElementsByClassName("suggestionItem");
      let selectedSuggestionIndex = -1;

      for (let i = 0; i < suggestionItems.length; i++) {
        if (suggestionItems[i].classList.contains("selected")) {
          selectedSuggestionIndex = i;
          break;
        }
      }

      if (event.key === "ArrowUp") {
        selectedSuggestionIndex =
          selectedSuggestionIndex === -1
            ? suggestionItems.length - 1
            : Math.max(selectedSuggestionIndex - 1, 0);
      } else if (event.key === "ArrowDown") {
        selectedSuggestionIndex = Math.min(
          selectedSuggestionIndex + 1,
          suggestionItems.length - 1
        );
      }

      for (let i = 0; i < suggestionItems.length; i++) {
        suggestionItems[i].classList.remove("selected");
      }
      suggestionItems[selectedSuggestionIndex].classList.add("selected");

      chatInput.value = suggestionItems[selectedSuggestionIndex].textContent;
    } else {
      const userInput = chatInput.value.trim();

      if (event.key === "ArrowUp" && ihIndex < ihLength) {
        ihIndex++;
        chatInput.value = inputHistory[ihLength - ihIndex];
      } else if (event.key === "ArrowDown" && ihIndex > 0) {
        ihIndex--;
        chatInput.value =
          ihIndex === -1 ? "" : inputHistory[ihLength - ihIndex];
      } else if (event.key === "ArrowUp" && ihIndex === ihLength) {
        ihIndex = 0;
        chatInput.value = inputHistory[ihLength - ihIndex];
      }
    }
  }
}

//
// Event listener function for Enter key
//
function handleEnterKey(event, chatInput, ihIndex, ihLength, inputHistory) {
  if (event.key === "Enter") {
    event.preventDefault();
    const userInput = chatInput.value.trim();

    inputHistory.unshift(userInput);
    ihLength = inputHistory.length - 1;
    ihIndex = 0;

    if (inputHistory[0] !== "") {
      inputHistory.unshift("");
      ihLength++;
    }

    const maxHistoryLength = 100;
    if (inputHistory.length > maxHistoryLength) {
      inputHistory.pop();
      ihLength--;
    }

    updateAndPersistInputHistory();

    if (userInput) {
      if (!userInput.startsWith(":") && !userInput.endsWith("+i")) {
        addChatMessage(you, markdownToHtml(userInput));
        history.push({ role: "user", content: userInput });
        browser.storage.local.set({ hist: JSON.stringify(history) });
      }
      sendChatMessage(userInput);
      chatInput.value = "";
      ihIndex = 0;
    }
  }
}

//
// Event listener function for input field keydown event
//
function handleKeyDown(
  event,
  chatInput,
  suggestionBox,
  ihIndex,
  ihLength,
  inputHistory
) {
  if (event.key === "Tab") {
    // Handle Tab key for accepting suggestions
    event.preventDefault();

    const inputValue = chatInput.value.trim();

    // Filter inputHistory to find suggestions based on the current input value
    const suggestions = getFilteredSuggestions(inputValue, inputHistory);

    // Use the first suggestion if available
    if (suggestions.length > 0) {
      chatInput.value = suggestions[0];
      document.getElementById("suggestionBox").style.display = "none";

      // Set focus back to the input field with a slight delay
      setTimeout(() => {
        chatInput.focus();
      }, 10);
    }
  } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    // Handle Arrow Up and Arrow Down keys
    event.preventDefault();

    const inputValue = chatInput.value.trim();

    // If the input field is not empty, navigate through suggestions
    if (inputValue !== "") {
      const suggestionBox = document.getElementById("suggestionBox");
      const suggestionItems =
        suggestionBox.getElementsByClassName("suggestionItem");

      // Determine the selected suggestion index
      let selectedSuggestionIndex = -1;
      for (let i = 0; i < suggestionItems.length; i++) {
        if (suggestionItems[i].classList.contains("selected")) {
          selectedSuggestionIndex = i;
          break;
        }
      }

      // Update the selected suggestion index based on the Arrow Up or Arrow Down key
      if (event.key === "ArrowUp") {
        if (selectedSuggestionIndex === -1) {
          selectedSuggestionIndex = suggestionItems.length - 1;
        } else {
          selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
        }
      } else if (event.key === "ArrowDown") {
        selectedSuggestionIndex = Math.min(
          selectedSuggestionIndex + 1,
          suggestionItems.length - 1
        );
      }

      // Update the selected class for suggestion items
      for (let i = 0; i < suggestionItems.length; i++) {
        suggestionItems[i].classList.remove("selected");
      }
      suggestionItems[selectedSuggestionIndex].classList.add("selected");

      // Update the input field with the selected suggestion
      chatInput.value = suggestionItems[selectedSuggestionIndex].textContent;
    } else {
      // If the input field is empty, navigate through the input history
      const userInput = chatInput.value.trim();

      if (event.key === "ArrowUp" && ihIndex < ihLength) {
        // Move up in history
        ihIndex++;
        chatInput.value = inputHistory[ihLength - ihIndex];
      } else if (event.key === "ArrowDown" && ihIndex > 0) {
        // Move down in history
        ihIndex--;

        // Set the input value to the selected history entry
        chatInput.value =
          ihIndex === -1 ? "" : inputHistory[ihLength - ihIndex];
      } else if (event.key === "ArrowUp" && ihIndex === ihLength) {
        // If at the bottom of history, move to the last entry
        ihIndex = 0;
        chatInput.value = inputHistory[ihLength - ihIndex];
      }
    }
  } else if (event.key === "Escape") {
    // Handle Escape key to close the suggestion list
    const suggestionBox = document.getElementById("suggestionBox");
    if (suggestionBox.style.display !== "none") {
      suggestionBox.style.display = "none";

      // Set focus back to the input field with a slight delay
      focusInput();
    }
  } else if (event.key === "Backspace" || event.key === "Delete") {
    // Handle Backspace and Delete keys to close the suggestion list when the input is empty
    if (chatInput.value.trim() === "") {
      document.getElementById("suggestionBox").style.display = "none";

      // Set focus back to the input field with a slight delay
      focusInput();
    }
  }
}

//
// Event listener function for keyup event
//
function handleKeyUp(event, chatInput, ihIndex, ihLength, inputHistory) {
  if (event.key === "Enter") {
    event.preventDefault();
    const userInput = chatInput.value.trim();

    // Add the entered text to history when Enter is pressed
    inputHistory.unshift(userInput);
    ihLength = inputHistory.length - 1;
    ihIndex = 0;

    // Ensure "" is always at the first position in history
    if (inputHistory[0] !== "") {
      inputHistory.unshift("");
      ihLength++;
    }

    // Limit the history to a certain number of entries if needed
    const maxHistoryLength = 100;
    if (inputHistory.length > maxHistoryLength) {
      inputHistory.pop();
      ihLength--;
    }

    // Update and persist the input history
    updateAndPersistInputHistory();

    if (userInput) {
      if (!userInput.startsWith(":") && !userInput.endsWith("+i")) {
        addChatMessage(you, markdownToHtml(userInput));
        history.push({ role: "user", content: userInput });
        browser.storage.local.set({ hist: JSON.stringify(history) });
      }
      sendChatMessage(userInput);
      chatInput.value = "";
      ihIndex = 0;
    }
  }
  if (event.key === "Escape") {
    const suggestionBox = document.getElementById("suggestionBox");
    if (suggestionBox.style.display !== "none") {
      suggestionBox.style.display = "none";
      focusInput();
    }
  } else if (event.key === "Backspace" || event.key === "Delete") {
    if (chatInput.value.trim() === "") {
      suggestionBox.style.display = "none";
      focusInput();
    }
  }
}

//
// Event listener function for drop event
//
function handleDrop(event, chatInput, inputHistory) {
  event.preventDefault();
  const userInput = event.dataTransfer.getData("text");
  if (userInput.startsWith("http://") || userInput.startsWith("https://")) {
    addChatMessage(you, userInput);
    sendChatMessage(userInput);
  } else {
    const selectedText =
      getText("readText") +
      getText("longSeparator") +
      userInput +
      getText("longSeparator");
    addChatMessage(you, markdownToHtml(getText("selectedText")));
    history.push({ role: "system", content: selectedText });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    addChatMessage(assistant, getText("ok"));
  }
}

//
// Event listener function for click event on send button
//
function handleSendButtonClick(chatInput, history) {
  const userInput = chatInput.value.trim();
  if (userInput) {
    addChatMessage(you, userInput);
    history.push({ role: "user", content: userInput });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    sendChatMessage(userInput);
    chatInput.value = "";
  }
}

//
// Event listener function for click event on chat toggle button
//
function handleChatToggleClick(chatWidget, chatToggle, chatVisible) {
  chatVisible = !chatVisible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
}

//
// Event listener function for input event
//
function handleInputChange(chatInput) {
  suggestInput();
  if (chatInput.value.trim() === "") {
    document.getElementById("suggestionBox").style.display = "none";
  }
}

//
// Event listener function for read-it message
//
function handleReadItMessage(msg) {
  if (msg.command === "read-it") {
    alert("read-it");
  }
}
