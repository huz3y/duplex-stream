import { Duplex } from "stream";
import fs from "fs";

class DuplexStream extends Duplex {
  constructor({
    writableHighWaterMark,
    readableHighWaterMark,
    readFileName,
    writeFileName,
  }) {
    // Now there is a writableHighWaterMark and a readableHighWaterMark
    super({ writableHighWaterMark, readableHighWaterMark });
    // Also we have two files(src, dest)
    this.readFileName = readFileName;
    this.writeFileName = writeFileName;
    // Because we have two files, we have two file descriptors
    this.readFd = null;
    this.writeFd = null;
    // initialize an array to hold the chunks and a property to track the chuck size
    this.chunks = [];
    this.chunksSize = 0;
  }
  _construct(callback) {
    // You might want to use promise to avoid callback hell
    fs.open(this.readFileName, "r", (err, readFd) => {
      if (err) {
        callback(err);
      } else {
        this.readFd = readFd;
        fs.open(this.writeFileName, "w", (err, writeFd) => {
          if (err) {
            callback(err);
          } else {
            this.writeFd = writeFd;
            callback();
          }
        });
      }
    });
  }
  _write(chunk, encoding, callback) {
    // do our write operation...and at the end call callback
    // push the chunk to our array
    this.chunks.push(chunk);
    // incremennt the chunks size
    this.chunksSize += chunk.length;
    // if chunksSize > highWaterMark
    if (this.chunksSize > this.writableHighWaterMark) {
      // do our write
      fs.write(this.writeFd, Buffer.concat(this.chunks), (err) => {
        if (err) {
          callback(err);
        } else {
          // empty chunks array and reset chunksSize
          this.chunks = [];
          this.chunksSize = 0;
          callback();
        }
      });
    }
  }

  _read(size) {
    const buff = Buffer.alloc(size);
    fs.read(this.readFd, buff, 0, size, null, (err, bytesRead, buffer) => {
      if (err) {
        // instead of callback(err), in read() whenver we have error we use this.destroy()
        this.destroy();
      } else {
        // pushing data emits 'data' event, pushing null emits 'end' event
        this.push(bytesRead > 0 ? buffer.subarray(0, bytesRead) : null);
      }
    });
  }
  _final(callback) {
    fs.write(this.writeFd, Buffer.concat(this.chunks), (err) => {
      if (err) {
        callback(err);
      } else {
        this.chunks = [];
        this.chunksSize = 0;
        callback();
      }
    });
  }
  _destroy(error, callback) {
    if (this.writefd) {
      fs.close(this.writeFd, (err) => {
        callback(err || error);
      });
    } else {
      callback(error);
    }
    if (this.readFd) {
      fs.close(this.readFd, (err) => {
        callback(err || error);
      });
    } else {
      callback(error);
    }
  }
}
