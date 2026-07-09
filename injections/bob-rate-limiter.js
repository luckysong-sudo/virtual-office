// [BOB_RATE_LIMITER_START]
// Rate limiting middleware
var rateLimitMap = {};
var RATE_LIMIT_WINDOW = 60000;
var RATE_LIMIT_MAX = 100;

function rateLimiter(req, res, next) {
    var ip = req.socket.remoteAddress;
    var now = Date.now();
    if (!rateLimitMap[ip]) rateLimitMap[ip] = { count: 0, window: now };
    var rec = rateLimitMap[ip];
    if (now - rec.window > RATE_LIMIT_WINDOW) { rec.count = 0; rec.window = now; }
    rec.count++;
    if (rec.count > RATE_LIMIT_MAX) {
        res.writeHead(429, {"Content-Type": "application/json"});
        res.end(JSON.stringify({"success":false,"error": "Rate limit exceeded"}));
        return;
    }
    next();
}
// [BOB_RATE_LIMITER_END]
