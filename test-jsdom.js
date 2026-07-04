const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('snapshot-assistant.html', 'utf8');
const js = fs.readFileSync('js/snapshot.js', 'utf8');

const dom = new JSDOM(html, { runScripts: "dangerously" });
const window = dom.window;

// Catch all errors in JSDOM
window.onerror = function (message, source, lineno, colno, error) {
    console.error("WINDOW ERROR:", message, "AT", lineno, colno);
    console.error(error);
}

try {
    window.eval(js);
    
    // Fire DOMContentLoaded
    const event = window.document.createEvent("Event");
    event.initEvent("DOMContentLoaded", true, true);
    window.document.dispatchEvent(event);

    window.checkImageQuality = () => true;
    
    // Simulate File Upload
    const fileUpload = window.document.getElementById('file-upload');
    const file = new window.File(["foo"], "foo.jpg", { type: "image/jpeg" });
    Object.defineProperty(fileUpload, 'files', { value: [file] });
    
    const changeEvent = window.document.createEvent("Event");
    changeEvent.initEvent("change", true, true);
    fileUpload.dispatchEvent(changeEvent);

    console.log("Triggered. Waiting for timeouts...");
    
    setTimeout(() => {
        console.log("Finished waiting!");
    }, 6000);

} catch (e) {
    console.error("Error executing JS:");
    console.error(e);
}
