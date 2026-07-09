
// [BOB_REQUEST_LOGGER_START]
// Request logging
var requestLog = [];
function requestLogger(req, res, next) {
    var start = Date.now();
    res.on("finish", function() {
        var entry = { method: req.method, path: req.url, status: res.statusCode, duration: Date.now()-start };
        requestLog.push(entry);
        if (requestLog.length > 1000) requestLog.shift();
        console.log(entry.method + " " + req.url + " - " + entry.duration + "ms");
    });
    next();
}
// [BOB_REQUEST_LOGGER_END]
