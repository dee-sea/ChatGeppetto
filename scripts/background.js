// Background script for the Firefox plugin
// Create a context menu item for reading page content
browser.contextMenus.create({
  id: "ReadPage",
  title: "Send page to ChatGeppetto",
});

browser.contextMenus.create({
  id: "ReadSel",
  title: "Send selection to ChatGeppetto",
  contexts: ["selection"],
});

// Function to handle context menu item clicks
browser.contextMenus.onClicked.addListener(function (info, tab) {
  // Check if the clicked menu item is "ReadPage"
  if (info.menuItemId == "ReadPage") {
    // Execute JavaScript file in the active tab
    browser.tabs.executeScript({
      file: "menu-scripts/readpage.js",
    });

    // NOTE: If additional logic is added in the future, explain it here
  } else if (info.menuItemId == "ReadSel") {
    // Execute JavaScript file in the active tab
    browser.tabs.executeScript({
      file: "menu-scripts/readsel.js",
    });
  }
});

// Register keyboard shortcuts
browser.commands.onCommand.addListener(function (command) {
  if (command === "readPage") {
    // Handle the "readPage" command
    console.log("Read Page command executed");
    sendMessageToTabs({ action: "readPageContent" });
  } else if (command === "readSelection") {
    // Handle the "readSelection" command
    console.log("Read Selection command executed");
    sendMessageToTabs({ action: "getSelection" });
  }
});

// Function to send a message to all tabs
function sendMessageToTabs(message) {
  browser.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      browser.tabs.sendMessage(tab.id, message);
    }
  });
}
