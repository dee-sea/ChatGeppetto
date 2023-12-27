// Create a context menu item
browser.contextMenus.create({
  id: "ReadPage",
  title: "Read Page Content",
});

// Function for the context menu item
browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId == "ReadPage") {
    browser.tabs.insertCSS({ file: "style.css" });
    browser.tabs.executeScript({
      file: "menu-scripts/readpage.js",
    });
  } else if (info.menuItemId == "ReadLink") {
    browser.tabs.sendMessage(tabs[0].id, {
      command: "read-it",
      readURL: info.linkUrl,
    });
  }
});
