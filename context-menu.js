browser.contextMenus.create({
  id: "ReadPage",
  title: "Read Page Content",
});

browser.contextMenus.create({
  id: "ReadLinks",
  title: "Read all linked pages",
});

//browser.contextMenus.create({
//  id: "ReadLink",
//  title: "Read linked page",
//  contexts: ["link"],
//});

browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId == "ReadPage") {
    browser.tabs.executeScript({
      file: "readpage.js",
    });
    //} else if (info.menuItemId == "ReadLink") {
    //  browser.tabs.executeScript({
    //    file: "readpage.js",
    //  });
  } else if (info.menuItemId == "ReadLinks") {
    browser.tabs.executeScript({
      file: "readalllinks.js",
    });
  }
});
