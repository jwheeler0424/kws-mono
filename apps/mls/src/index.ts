console.log("Hello, MLS Grid Application!");

process.on("SIGINT", () => {
  console.log("Ctrl-C was pressed");
  process.exit();
});