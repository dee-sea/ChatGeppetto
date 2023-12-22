pagecontent = document.body.innerHTML;
var doc = new DOMParser().parseFromString(html, "text/html");
elementList = doc.querySelectorAll([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "figcaption",
]);
for (u = 0; u < elementList.length; u++) {
  text = text + "\n\n" + elementList.item(u).textContent.trim();
}
text = text.trim();
command = "/readpagecontent " + text;
sendChatMessage(command);
