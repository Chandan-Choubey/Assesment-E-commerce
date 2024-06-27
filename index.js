import dotenv from "dotenv";
import fs from "fs";
import https from "https";
import connectDb from "./src/db/index.js";
import { app } from "./app.js";

dotenv.config({ path: "./.env" });

console.log(process.env.SSL_PRIVATE_KEY_PATH);
const privateKey = fs.readFileSync(process.env.SSL_PRIVATE_KEY_PATH, "utf8");
const certificate = fs.readFileSync(process.env.SSL_CERTIFICATE_PATH, "utf8");
const credentials = { key: privateKey, cert: certificate };

connectDb()
  .then(() => {
    const httpsServer = https.createServer(credentials, app);

    httpsServer.listen(process.env.HTTPS_PORT || 443, () => {
      console.log(
        `HTTPS Server is running on port ${process.env.HTTPS_PORT || 443}`
      );
    });
  })
  .catch((err) => {
    console.log("MongoDB Connection Error: " + err);
  });
