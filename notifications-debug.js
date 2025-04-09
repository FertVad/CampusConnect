console.log("Viewing notifications data:"); fetch("/api/notifications").then(r => r.json()).then(console.log).catch(console.error)
