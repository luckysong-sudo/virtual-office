// [EVE_ENDPOINT_WHITELIST_START]
// Endpoint whitelist validation
var ALLOWED_ENDPOINTS = ["agents","relationships","memory","move","status","events","tasks","task-progress","boss-order","chat","agent-chat","update","personality","daily-briefing","timeline","meetings","export","learn","logs","health","metrics"];

function validateEndpoint(ep) {
    var parts = ep.split("/");
    var action = parts[0];
    if (ALLOWED_ENDPOINTS.indexOf(action) === -1) {
        return { valid: false, error: "Unknown endpoint: " + action };
    }
    return { valid: true, action: action, id: parts[1] };
}

var epValidation = validateEndpoint(endpoint);
if (!epValidation.valid) {
    return { success: false, error: epValidation.error, allowedEndpoints: ALLOWED_ENDPOINTS };
}
const action = epValidation.action;
const id = epValidation.id;
// [EVE_ENDPOINT_WHITELIST_END]
