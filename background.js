browser.contextMenus.create({
  id: "ChatGeppetto",
  title: "ChatGeppetto",
});

browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId == "ChatGeppetto") {
    browser.tabs.insertCSS({ file: "style.css" });
    browser.tabs.executeScript({
      file: "geppetto.js",
    });
  }
});
