import dotenv from "dotenv";
import fs from "fs";
import http from "http";
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
    const httpServer = http.createServer((req, res) => {
      res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
      res.end();
    });

    const httpsServer = https.createServer(credentials, app);

    httpServer.listen(process.env.HTTP_PORT || 3000, () => {
      console.log(
        `HTTP Server is running on port ${process.env.HTTP_PORT || 3000}`
      );
    });

    httpsServer.listen(process.env.HTTPS_PORT || 443, () => {
      console.log(
        `HTTPS Server is running on port ${process.env.HTTPS_PORT || 443}`
      );
    });
  })
  .catch((err) => {
    console.log("MongoDB Connection Error: " + err);
  });
