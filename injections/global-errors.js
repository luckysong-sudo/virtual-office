
// Global error handling
process.on("uncaughtException", function(err) {
    console.error("[UNCAUGHT]", err.message);
});

process.on("unhandledRejection", function(reason) {
    console.error("[UNHANDLED REJECTION]", reason);
});

process.on("SIGTERM", function() {
    console.log("Received SIGTERM, shutting down...");
    server.close(function() { process.exit(0); });
});

process.on("SIGINT", function() {
    console.log("Received SIGINT, shutting down...");
    server.close(function() { process.exit(0); });
});
